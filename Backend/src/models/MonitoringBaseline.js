const mongoose = require("mongoose");

const StatsSchema = new mongoose.Schema({
  count: { type: Number, default: 0 },
  mean: { type: Number, default: 0 },
  m2: { type: Number, default: 0 },
  min: { type: Number, default: null },
  max: { type: Number, default: null }
}, { _id: false });

const MonitoringBaselineSchema = new mongoose.Schema({
  prediction: { type: StatsSchema, default: () => ({}) },
  features: { type: Map, of: StatsSchema, default: {} },
  count: { type: Number, default: 0 },
  isFrozen: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("MonitoringBaseline", MonitoringBaselineSchema);
