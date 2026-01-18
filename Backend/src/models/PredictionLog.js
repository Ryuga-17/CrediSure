const mongoose = require("mongoose");

const PredictionLogSchema = new mongoose.Schema({
  loanApplication: { type: mongoose.Schema.Types.ObjectId, ref: "LoanApplication" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  features: { type: Object, required: true },
  creditScore: { type: Number },
  probabilityOfDefault: { type: Number },
  riskBucket: { type: String },
  driftFlags: { type: Object, default: {} },
  explanationSummary: { type: Array, default: [] },
  preprocessingVersion: { type: String },
  modelVersions: { type: Object }
}, { timestamps: true });

module.exports = mongoose.model("PredictionLog", PredictionLogSchema);
