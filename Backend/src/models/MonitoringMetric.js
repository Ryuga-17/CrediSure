const mongoose = require("mongoose");

const StatsSchema = new mongoose.Schema({
  count: { type: Number, default: 0 },
  mean: { type: Number, default: 0 },
  m2: { type: Number, default: 0 },
  min: { type: Number, default: null },
  max: { type: Number, default: null }
}, { _id: false });

const MonitoringMetricSchema = new mongoose.Schema({
  date: { type: String, required: true, index: true },
  prediction: { type: StatsSchema, default: () => ({}) },
  features: { type: Map, of: StatsSchema, default: {} },
  categorical: { type: Object, default: {} },
  driftCounts: { type: Object, default: {} }
}, { timestamps: true });

MonitoringMetricSchema.index({ date: 1 }, { unique: true });

module.exports = mongoose.model("MonitoringMetric", MonitoringMetricSchema);
