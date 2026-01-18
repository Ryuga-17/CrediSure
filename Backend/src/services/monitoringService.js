const MonitoringMetric = require("../models/MonitoringMetric");
const MonitoringBaseline = require("../models/MonitoringBaseline");
const PredictionLog = require("../models/PredictionLog");

const BASELINE_SAMPLE_LIMIT = 200;
const MIN_BASELINE_FOR_DRIFT = 50;
const DRIFT_Z_THRESHOLD = 3;

const NUMERIC_FEATURE_KEYS = [
  "age",
  "income",
  "loanAmount",
  "loanRate",
  "loanTerm",
  "existingDebtPayment",
  "dtiRatio",
  "creditScore"
];

const CATEGORICAL_FEATURE_KEYS = [
  "loanPurpose",
  "hasMortgage",
  "hasDependents"
];

const initStat = () => ({
  count: 0,
  mean: 0,
  m2: 0,
  min: null,
  max: null
});

const updateStat = (stat, value) => {
  const next = stat ? { ...stat } : initStat();
  next.count += 1;
  const delta = value - next.mean;
  next.mean += delta / next.count;
  const delta2 = value - next.mean;
  next.m2 += delta * delta2;
  next.min = next.min === null ? value : Math.min(next.min, value);
  next.max = next.max === null ? value : Math.max(next.max, value);
  return next;
};

const calculateZScore = (stat, value) => {
  if (!stat || stat.count < MIN_BASELINE_FOR_DRIFT) {
    return 0;
  }
  const variance = stat.count > 1 ? stat.m2 / (stat.count - 1) : 0;
  const std = Math.sqrt(Math.max(variance, 1e-6));
  return Math.abs(value - stat.mean) / std;
};

const updateCategoricalCounts = (existing = {}, key, value) => {
  const next = { ...existing };
  const stringValue = String(value);
  next[key] = next[key] || {};
  next[key][stringValue] = (next[key][stringValue] || 0) + 1;
  return next;
};

const getDateKey = () => new Date().toISOString().slice(0, 10);

const recordPrediction = async ({
  loanApplicationId,
  userId,
  features,
  probabilityOfDefault,
  creditScore,
  riskBucket,
  explanationSummary,
  preprocessingVersion,
  modelVersions
}) => {
  const baseline = await MonitoringBaseline.findOne() || new MonitoringBaseline();
  const driftFlags = {};

  if (!baseline.isFrozen) {
    NUMERIC_FEATURE_KEYS.forEach((key) => {
      const value = Number(features[key]);
      if (!Number.isFinite(value)) {
        return;
      }
      const stat = baseline.features.get(key) || initStat();
      baseline.features.set(key, updateStat(stat, value));
    });
    baseline.prediction = updateStat(baseline.prediction || initStat(), probabilityOfDefault);
    baseline.count += 1;
    if (baseline.count >= BASELINE_SAMPLE_LIMIT) {
      baseline.isFrozen = true;
    }
    await baseline.save();
  }

  NUMERIC_FEATURE_KEYS.forEach((key) => {
    const value = Number(features[key]);
    if (!Number.isFinite(value)) {
      return;
    }
    const stat = baseline.features.get(key);
    const zScore = calculateZScore(stat, value);
    if (zScore >= DRIFT_Z_THRESHOLD) {
      driftFlags[key] = true;
    }
  });

  const dateKey = getDateKey();
  const dailyMetric = await MonitoringMetric.findOne({ date: dateKey }) || new MonitoringMetric({ date: dateKey });

  NUMERIC_FEATURE_KEYS.forEach((key) => {
    const value = Number(features[key]);
    if (!Number.isFinite(value)) {
      return;
    }
    const stat = dailyMetric.features.get(key) || initStat();
    dailyMetric.features.set(key, updateStat(stat, value));
  });

  dailyMetric.prediction = updateStat(dailyMetric.prediction || initStat(), probabilityOfDefault);

  CATEGORICAL_FEATURE_KEYS.forEach((key) => {
    if (features[key] === undefined || features[key] === null) {
      return;
    }
    dailyMetric.categorical = updateCategoricalCounts(dailyMetric.categorical, key, features[key]);
  });

  Object.keys(driftFlags).forEach((key) => {
    dailyMetric.driftCounts[key] = (dailyMetric.driftCounts[key] || 0) + 1;
  });

  await dailyMetric.save();

  await PredictionLog.create({
    loanApplication: loanApplicationId,
    user: userId,
    features,
    creditScore,
    probabilityOfDefault,
    riskBucket,
    driftFlags,
    explanationSummary: explanationSummary || [],
    preprocessingVersion,
    modelVersions
  });

  return driftFlags;
};

module.exports = {
  recordPrediction
};
