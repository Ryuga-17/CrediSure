const express = require("express");
const router = express.Router();
const LoanApplication = require("../models/LoanApplication");
const authMiddleware = require("../middlewares/auth");
const csrfProtection = require("../middlewares/csrf");
const mlService = require("../services/mlService");
const monitoringService = require("../services/monitoringService");
const { loanRequestSchema } = require("../schemas/loanSchemas");
const { param, validationResult } = require("express-validator");
const { createRateLimiter } = require("../middlewares/rateLimit");
const logger = require("../utils/logger");

// Kept on the same 0-1 ratio scale the models are trained on (the source
// dataset's DTIRatio column is e.g. 0.44, not 44) -- this value is logged
// into monitoringService's drift stats, which must match the model's
// actual input scale to mean anything.
const calculateDtiRatio = (income, existingDebtPayment) => {
  if (!income || income <= 0) return 0;
  return existingDebtPayment / income;
};

// These are the most expensive routes in the app (each one runs two ML
// models plus a SHAP explanation through a single shared Python process --
// see mlService.js), unlike auth's login/register they had no rate limiting
// at all until now.
const submitLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many loan applications submitted. Please try again in a few minutes."
});
const predictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many prediction requests. Please try again in a few minutes."
});

// Submit a new loan application with ML predictions
router.post("/", authMiddleware, csrfProtection, submitLimiter, loanRequestSchema, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      age,
      income,
      existingDebtPayment,
      loanAmount,
      loanRate,
      loanTerm,
      hasDependents,
      hasMortgage,
      loanPurpose,
      numBankAccounts,
      numCreditCards,
      numOfDelayedPayment,
      creditMix
    } = req.body;

    // Get ML predictions. The application is still recorded if scoring fails,
    // but the client is told so rather than being handed a silently empty result.
    let predictions = null;
    let predictionError = null;
    try {
      predictions = await mlService.predict({
        age,
        income,
        loanAmount,
        loanRate,
        loanTerm,
        existingDebtPayment: existingDebtPayment || 0,
        loanPurpose,
        hasMortgage: hasMortgage || false,
        hasDependents: hasDependents || false,
        numBankAccounts: numBankAccounts || 0,
        numCreditCards: numCreditCards || 0,
        numOfDelayedPayment: numOfDelayedPayment || 0,
        creditMix: creditMix || 'Unknown'
      });
    } catch (mlError) {
      logger.error("ML Prediction Error", { err: mlError, requestId: req.id });
      predictionError = mlError.message;
    }

    // Create loan application with predictions
    const loanApplication = new LoanApplication({
      user: req.user.id,
      name,
      age,
      income,
      existingDebtPayment: existingDebtPayment || 0,
      loanAmount,
      loanRate,
      loanTerm,
      hasDependents: hasDependents || false,
      hasMortgage: hasMortgage || false,
      loanPurpose,
      numBankAccounts: numBankAccounts || 0,
      numCreditCards: numCreditCards || 0,
      numOfDelayedPayment: numOfDelayedPayment || 0,
      creditMix: creditMix || 'Unknown',
      creditScore: predictions?.creditScore,
      creditScoreExplanation: predictions?.creditScoreExplanation,
      defaultStatus: predictions?.defaultStatus,
      defaultProbability: predictions?.defaultProbability,
      riskBucket: predictions?.riskBucket,
      explanationSummary: predictions?.explanationSummary,
      preprocessingVersion: predictions?.preprocessingVersion,
      modelVersions: predictions?.modelVersions
    });

    await loanApplication.save();

    if (predictions) {
      const dtiRatio = calculateDtiRatio(income, existingDebtPayment || 0);
      try {
        await monitoringService.recordPrediction({
          loanApplicationId: loanApplication._id,
          userId: req.user.id,
          features: {
            age,
            income,
            loanAmount,
            loanRate,
            loanTerm,
            existingDebtPayment: existingDebtPayment || 0,
            dtiRatio,
            loanPurpose,
            hasMortgage: hasMortgage || false,
            hasDependents: hasDependents || false,
            numBankAccounts: numBankAccounts || 0,
            numCreditCards: numCreditCards || 0,
            numOfDelayedPayment: numOfDelayedPayment || 0,
            creditMix: creditMix || 'Unknown',
            creditScore: predictions.creditScore
          },
          probabilityOfDefault: predictions.defaultProbability,
          creditScore: predictions.creditScore,
          creditScoreExplanation: predictions.creditScoreExplanation,
          riskBucket: predictions.riskBucket,
          explanationSummary: predictions.explanationSummary,
          preprocessingVersion: predictions.preprocessingVersion,
          modelVersions: predictions.modelVersions
        });
      } catch (monitoringError) {
        // Monitoring is observability, not part of the decision: never fail the
        // application because a metrics write failed.
        logger.error("Monitoring Error", { err: monitoringError, requestId: req.id });
      }
    }

    res.status(201).json({
      ...loanApplication.toObject(),
      predictionAvailable: Boolean(predictions),
      ...(predictionError ? { predictionError } : {})
    });
  } catch (err) {
    logger.error("Loan Application Error", { err, requestId: req.id });
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// Get all loan applications for a user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const applications = await LoanApplication.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(applications);
  } catch (err) {
    logger.error("List Loan Applications Error", { err, requestId: req.id });
    res.status(500).json({ error: "Server error" });
  }
});

// Get a specific loan application by ID
router.get("/:id", authMiddleware, [
  // Without this, a malformed id throws a Mongoose CastError that the
  // catch below turns into a 500 -- a client mistake, not a server one.
  // isMongoId() (not a hand-rolled check) so this returns the same
  // {errors: [...]} shape every other validation failure in this file does.
  param("id").isMongoId().withMessage("Invalid loan application id")
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const application = await LoanApplication.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!application) {
      return res.status(404).json({ error: "Loan application not found" });
    }
    
    res.json(application);
  } catch (err) {
    logger.error("Get Loan Application Error", { err, requestId: req.id });
    res.status(500).json({ error: "Server error" });
  }
});

// Get predictions for loan application data (without saving)
router.post("/predict", authMiddleware, csrfProtection, predictLimiter, loanRequestSchema, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      age,
      income,
      existingDebtPayment,
      loanAmount,
      loanRate,
      loanTerm,
      hasDependents,
      hasMortgage,
      loanPurpose,
      numBankAccounts,
      numCreditCards,
      numOfDelayedPayment,
      creditMix
    } = req.body;

    // Get ML predictions
    const predictions = await mlService.predict({
      age,
      income,
      loanAmount,
      loanRate,
      loanTerm,
      existingDebtPayment: existingDebtPayment || 0,
      loanPurpose,
      hasMortgage: hasMortgage || false,
      hasDependents: hasDependents || false,
      numBankAccounts: numBankAccounts || 0,
      numCreditCards: numCreditCards || 0,
      numOfDelayedPayment: numOfDelayedPayment || 0,
      creditMix: creditMix || 'Unknown'
    });

    res.json({
      success: true,
      creditScore: predictions.creditScore,
      creditScoreExplanation: predictions.creditScoreExplanation || [],
      defaultStatus: predictions.defaultStatus,
      defaultProbability: predictions.defaultProbability,
      riskBucket: predictions.riskBucket,
      explanationSummary: predictions.explanationSummary || [],
      preprocessingVersion: predictions.preprocessingVersion,
      modelVersions: predictions.modelVersions,
      credit_score: predictions.creditScore,
      credit_score_explanation: predictions.creditScoreExplanation || [],
      probability_of_default: predictions.defaultProbability,
      risk_bucket: predictions.riskBucket,
      explanation_summary: predictions.explanationSummary || []
    });
  } catch (err) {
    logger.error("Prediction Error", { err, requestId: req.id });
    res.status(500).json({ error: "Prediction failed", details: err.message });
  }
});

module.exports = router;