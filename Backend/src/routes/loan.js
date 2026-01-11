const express = require("express");
const router = express.Router();
const LoanApplication = require("../models/LoanApplication");
const authMiddleware = require("../middlewares/auth");
const mlService = require("../services/mlService");

// Submit a new loan application with ML predictions
router.post("/", authMiddleware, async (req, res) => {
  try {
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

    // Validate required fields
    if (!name || !age || !income || !loanAmount || !loanRate || !loanTerm || !loanPurpose) {
      return res.status(400).json({ error: "Missing required fields" });
    }

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
      defaultProbability: predictions?.defaultProbability
    });

    await loanApplication.save();
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
router.post("/predict", authMiddleware, async (req, res) => {
  try {
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

    // Validate required fields
    if (!age || !income || !loanAmount || !loanRate || !loanTerm || !loanPurpose) {
      return res.status(400).json({ error: "Missing required fields" });
    }

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
      defaultProbability: predictions.defaultProbability
    });
  } catch (err) {
    console.error("Prediction Error:", err);
    res.status(500).json({ error: "Prediction failed", details: err.message });
  }
});

module.exports = router;