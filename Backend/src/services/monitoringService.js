const MonitoringMetric = require("../models/MonitoringMetric");
const MonitoringBaseline = require("../models/MonitoringBaseline");
const PredictionLog = require("../models/PredictionLog");

const BASELINE_SAMPLE_LIMIT = 200;
const MIN_BASELINE_FOR_DRIFT = 50;
const DRIFT_Z_THRESHOLD = 3;

// Bump this whenever a change alters the *scale* of a value fed into the
// baseline (e.g. the DTIRatio *100 removal, or a credit-score denormalization
// change) -- not for ordinary feature additions. A baseline accumulates raw
// running mean/variance, so mixing pre- and post-change values into the same
// stats produces a distribution that matches neither scale, and
// calculateZScore's output stops meaning anything. recordPrediction() resets
// (not merely re-tags) any baseline whose scaleVersion doesn't match this, so
// a scale-changing deploy self-heals on its first prediction instead of
// requiring a manual DB reset.
const BASELINE_SCALE_VERSION = 2;

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

/**
 * Mongoose subdocuments keep their values in `_doc` and expose them through
 * prototype getters, so spreading one yields `{ $__, $__parent, _doc }` and
 * drops every number. Normalise to a plain object before doing arithmetic.
 */
const toPlainStat = (stat) => {
  if (!stat) {
    return initStat();
  }
  const plain = typeof stat.toObject === "function" ? stat.toObject() : stat;
  return {
    count: Number.isFinite(plain.count) ? plain.count : 0,
    mean: Number.isFinite(plain.mean) ? plain.mean : 0,
    m2: Number.isFinite(plain.m2) ? plain.m2 : 0,
    min: Number.isFinite(plain.min) ? plain.min : null,
    max: Number.isFinite(plain.max) ? plain.max : null
  };
};

const updateStat = (stat, value) => {
  const next = toPlainStat(stat);
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
  const plain = toPlainStat(stat);
  if (plain.count < MIN_BASELINE_FOR_DRIFT) {
    return 0;
  }
  const variance = plain.count > 1 ? plain.m2 / (plain.count - 1) : 0;
  const std = Math.sqrt(Math.max(variance, 1e-6));
  return Math.abs(value - plain.mean) / std;
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
  creditScoreExplanation,
  riskBucket,
  explanationSummary,
  preprocessingVersion,
  modelVersions
}) => {
  // Upsert rather than findOne-or-new so concurrent first predictions cannot
  // create competing baseline documents.
  const baseline = await MonitoringBaseline.findOneAndUpdate(
    {},
    { $setOnInsert: { count: 0, isFrozen: false, scaleVersion: BASELINE_SCALE_VERSION } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const driftFlags = {};

  // A baseline computed under a different feature scale (see
  // BASELINE_SCALE_VERSION's comment) is worse than no baseline at all --
  // every z-score it produces is meaningless. Reset in place rather than
  // deleting the document, so the unique baseline-per-deployment invariant
  // (enforced by the upsert above) still holds.
  if (baseline.scaleVersion !== BASELINE_SCALE_VERSION) {
    baseline.features = new Map();
    baseline.prediction = initStat();
    baseline.count = 0;
    baseline.isFrozen = false;
    baseline.scaleVersion = BASELINE_SCALE_VERSION;
  }

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
  // `date` carries a unique index, so a findOne-then-insert would throw a
  // duplicate-key error on the first two requests of any given day.
  const dailyMetric = await MonitoringMetric.findOneAndUpdate(
    { date: dateKey },
    { $setOnInsert: { date: dateKey } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

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

  const driftCounts = { ...(dailyMetric.driftCounts || {}) };
  Object.keys(driftFlags).forEach((key) => {
    driftCounts[key] = (driftCounts[key] || 0) + 1;
  });
  dailyMetric.driftCounts = driftCounts;

  // `categorical` and `driftCounts` are Mixed paths: Mongoose cannot detect
  // in-place mutation, so mark them dirty explicitly before saving.
  dailyMetric.markModified("categorical");
  dailyMetric.markModified("driftCounts");

  await dailyMetric.save();

  await PredictionLog.create({
    loanApplication: loanApplicationId,
    user: userId,
    features,
    creditScore,
    creditScoreExplanation: creditScoreExplanation || [],
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
