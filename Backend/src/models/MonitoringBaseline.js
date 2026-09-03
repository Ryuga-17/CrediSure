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
  isFrozen: { type: Boolean, default: false },
  // Tags which feature-scale generation this baseline's stats were computed
  // under (see monitoringService.js's BASELINE_SCALE_VERSION). Defaults to 1
  // (not the current version) specifically so a document written before this
  // field existed hydrates as version 1 -- i.e. still reads as stale against
  // a bumped current version -- rather than silently matching by omission.
  scaleVersion: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model("MonitoringBaseline", MonitoringBaselineSchema);
