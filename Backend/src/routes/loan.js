const express = require("express");
const router = express.Router();
const LoanApplication = require("../models/LoanApplication");
const authMiddleware = require("../middlewares/auth");
const mlService = require("../services/mlService");
const monitoringService = require("../services/monitoringService");
const { loanRequestSchema } = require("../schemas/loanSchemas");
const { validationResult } = require("express-validator");

const calculateDtiRatio = (income, existingDebtPayment) => {
  if (!income || income <= 0) return 0;
  return (existingDebtPayment / income) * 100;
};

// Submit a new loan application with ML predictions
router.post("/", authMiddleware, loanRequestSchema, async (req, res) => {
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
      loanPurpose
    } = req.body;

    // Get ML predictions
    let predictions = null;
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
        hasDependents: hasDependents || false
      });
    } catch (mlError) {
      console.error("ML Prediction Error:", mlError);
      // Continue with application submission even if ML prediction fails
      // You can choose to return an error here if predictions are mandatory
      // return res.status(500).json({ error: "ML prediction failed", details: mlError.message });
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
      creditScore: predictions?.creditScore,
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
          creditScore: predictions.creditScore
        },
        probabilityOfDefault: predictions.defaultProbability,
        creditScore: predictions.creditScore,
        riskBucket: predictions.riskBucket,
        explanationSummary: predictions.explanationSummary,
        preprocessingVersion: predictions.preprocessingVersion,
        modelVersions: predictions.modelVersions
      });
    }

    res.status(201).json(loanApplication);
  } catch (err) {
    console.error("Loan Application Error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// Get all loan applications for a user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const applications = await LoanApplication.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get a specific loan application by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const application = await LoanApplication.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    
    if (!application) {
      return res.status(404).json({ error: "Loan application not found" });
    }
    
    res.json(application);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get predictions for loan application data (without saving)
router.post("/predict", authMiddleware, loanRequestSchema, async (req, res) => {
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
      loanPurpose
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
      hasDependents: hasDependents || false
    });

    res.json({
      success: true,
      creditScore: predictions.creditScore,
      defaultStatus: predictions.defaultStatus,
      defaultProbability: predictions.defaultProbability,
      riskBucket: predictions.riskBucket,
      explanationSummary: predictions.explanationSummary || [],
      preprocessingVersion: predictions.preprocessingVersion,
      modelVersions: predictions.modelVersions,
      credit_score: predictions.creditScore,
      probability_of_default: predictions.defaultProbability,
      risk_bucket: predictions.riskBucket,
      explanation_summary: predictions.explanationSummary || []
    });
  } catch (err) {
    console.error("Prediction Error:", err);
    res.status(500).json({ error: "Prediction failed", details: err.message });
  }
});

module.exports = router;