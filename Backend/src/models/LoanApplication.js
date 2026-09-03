const mongoose = require("mongoose");

const LoanApplicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true },
  age: { type: Number, required: true },
  income: { type: Number, required: true },
  existingDebtPayment: { type: Number, required: true },
  loanAmount: { type: Number, required: true },
  loanRate: { type: Number, required: true },
  loanTerm: { type: Number, required: true },
  hasDependents: { type: Boolean, required: true },
  hasMortgage: { type: Boolean, required: true },
  loanPurpose: { type: String, required: true },
  numBankAccounts: { type: Number },
  numCreditCards: { type: Number },
  numOfDelayedPayment: { type: Number },
  creditMix: { type: String },
  status: { 
    type: String, 
    enum: ["pending", "approved", "rejected"], 
    default: "pending" 
  },
  // ML Prediction results
  creditScore: { type: String },
  creditScoreExplanation: { type: Array, default: [] },
  defaultStatus: { type: Number }, // 0 = Non-Default, 1 = Default
  defaultProbability: { type: Number },
  riskBucket: { type: String },
  explanationSummary: { type: Array, default: [] },
  preprocessingVersion: { type: String },
  modelVersions: { type: Object },
}, { timestamps: true });

module.exports = mongoose.model("LoanApplication", LoanApplicationSchema);