/**
 * Tests for the Welford running-mean/variance math and drift z-score
 * threshold inside Backend/src/services/monitoringService.js.
 *
 * updateStat/calculateZScore are module-private (not exported), and we are
 * not allowed to change production code in this pass, so these tests drive
 * them through the one public entry point, recordPrediction(), and inspect
 * the resulting baseline/driftFlags -- the standard way to test private
 * helpers without changing the module under test.
 *
 * recordPrediction() talks to three Mongoose models via findOneAndUpdate /
 * save / create. There's no live MongoDB in this environment (see AUDIT.md),
 * so those three methods are monkey-patched in-memory before each test. This
 * only replaces functions on the already-required model objects at runtime;
 * it does not touch any file on disk.
 */
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const MonitoringBaseline = require('../src/models/MonitoringBaseline');
const MonitoringMetric = require('../src/models/MonitoringMetric');
const PredictionLog = require('../src/models/PredictionLog');
const monitoringService = require('../src/services/monitoringService');

const MIN_BASELINE_FOR_DRIFT = 50; // must match monitoringService.js
const BASELINE_SAMPLE_LIMIT = 200; // must match monitoringService.js
const BASELINE_SCALE_VERSION = 2; // must match monitoringService.js

function makeFakeBaseline(overrides = {}) {
  return {
    features: new Map(),
    prediction: null,
    count: 0,
    isFrozen: false,
    scaleVersion: BASELINE_SCALE_VERSION,
    async save() {},
    ...overrides,
  };
}

function makeFakeDailyMetric() {
  return {
    features: new Map(),
    prediction: null,
    categorical: {},
    driftCounts: {},
    markModified() {},
    async save() {},
  };
}

let fakeBaseline;
let fakeDailyMetric;

beforeEach(() => {
  fakeBaseline = makeFakeBaseline();
  fakeDailyMetric = makeFakeDailyMetric();
  MonitoringBaseline.findOneAndUpdate = async () => fakeBaseline;
  MonitoringMetric.findOneAndUpdate = async () => fakeDailyMetric;
  PredictionLog.create = async (doc) => doc;
});

function makeFeatures(overrides = {}) {
  return {
    age: 30,
    income: 1000,
    loanAmount: 5000,
    loanRate: 5,
    loanTerm: 3,
    existingDebtPayment: 100,
    dtiRatio: 10,
    loanPurpose: 'Home',
    hasMortgage: false,
    hasDependents: false,
    creditScore: 600,
    ...overrides,
  };
}

async function record(featureOverrides = {}) {
  return monitoringService.recordPrediction({
    loanApplicationId: 'loan1',
    userId: 'user1',
    features: makeFeatures(featureOverrides),
    probabilityOfDefault: 0.2,
    creditScore: 600,
    riskBucket: 'Low Risk',
    explanationSummary: [],
    preprocessingVersion: 'v1',
    modelVersions: {},
  });
}

test('Welford update produces the correct running mean/variance/min/max', async () => {
  // Reference: mean=30, sample variance (m2/(n-1))=250 => m2=1000, for
  // [10,20,30,40,50] via the standard two-pass formula. Confirmed against a
  // standalone reimplementation of the exact same update rule before writing
  // this assertion.
  for (const value of [10, 20, 30, 40, 50]) {
    await record({ income: value });
  }

  const incomeStat = fakeBaseline.features.get('income');
  assert.equal(incomeStat.count, 5);
  assert.equal(incomeStat.mean, 30);
  assert.equal(incomeStat.m2, 1000);
  assert.equal(incomeStat.min, 10);
  assert.equal(incomeStat.max, 50);
});

test('drift is never flagged before MIN_BASELINE_FOR_DRIFT samples, regardless of how extreme the value is', async () => {
  const mildValues = [900, 950, 1000, 1050, 1100];
  for (let i = 0; i < MIN_BASELINE_FOR_DRIFT - 9; i += 1) {
    const result = await record({ income: mildValues[i % mildValues.length] });
    assert.equal(result.income, undefined, `sample ${i + 1} should not flag drift`);
  }
  assert.equal(fakeBaseline.count, MIN_BASELINE_FOR_DRIFT - 9);

  // Still below the count=50 guard (count will become 42), so even a wildly
  // extreme value must not be flagged -- the guard is purely on sample
  // count, not on how far the value is from the mean.
  const stillGuarded = await record({ income: 5_000_000 });
  assert.equal(fakeBaseline.count, MIN_BASELINE_FOR_DRIFT - 8);
  assert.equal(stillGuarded.income, undefined, 'guard must block drift flags below MIN_BASELINE_FOR_DRIFT regardless of magnitude');
});

test('drift threshold: matching values never flag; a genuine outlier past 50 samples does', async () => {
  // 50 identical samples: mean stays 1000, variance stays 0 the whole time,
  // so z-score is 0 for every one of them (MIN_BASELINE_FOR_DRIFT guard, then
  // z=0 once the guard lifts because the value always matches the mean).
  let lastResult;
  for (let i = 0; i < MIN_BASELINE_FOR_DRIFT; i += 1) {
    lastResult = await record({ income: 1000 });
  }
  assert.equal(fakeBaseline.count, MIN_BASELINE_FOR_DRIFT);
  assert.equal(lastResult.income, undefined, 'identical value should not be flagged as drift');
  assert.equal(fakeBaseline.features.get('income').m2, 0);

  // 51st sample: a genuine outlier. calculateZScore uses the *post-update*
  // stat (the outlier is folded into the running mean/variance before being
  // compared against it), so the expected z is ~7.0 (sqrt(n-1) as the
  // outlier's magnitude grows), not some naive "huge" number -- confirmed by
  // reimplementing the exact update/z-score formulas standalone before
  // writing this assertion.
  const outlierResult = await record({ income: 999999 });
  assert.equal(outlierResult.income, true, 'outlier past the 3-sigma threshold must be flagged');

  const incomeStat = fakeBaseline.features.get('income');
  assert.equal(incomeStat.count, 51);
  assert.ok(
    Math.abs(incomeStat.mean - 20588.21568627451) < 1e-6,
    `mean drifted to unexpected value: ${incomeStat.mean}`
  );
});

test('baseline freezes at BASELINE_SAMPLE_LIMIT and stops updating, but drift detection still runs against the frozen baseline', async () => {
  for (let i = 0; i < BASELINE_SAMPLE_LIMIT; i += 1) {
    await record({ income: 1000 });
  }
  assert.equal(fakeBaseline.count, BASELINE_SAMPLE_LIMIT);
  assert.equal(fakeBaseline.isFrozen, true);

  const frozenStatBefore = { ...fakeBaseline.features.get('income') };

  // One more sample, wildly different. Baseline must NOT move (it's frozen),
  // but drift must still be detected against the now-fixed baseline.
  const result = await record({ income: 999999 });

  assert.equal(fakeBaseline.count, BASELINE_SAMPLE_LIMIT, 'count must not grow past the freeze point');
  assert.deepEqual(
    fakeBaseline.features.get('income'),
    frozenStatBefore,
    'baseline stats must be unchanged once frozen'
  );
  assert.equal(result.income, true, 'drift detection must still fire against the frozen baseline');
});

test('dailyMetric is updated every call regardless of baseline freeze state', async () => {
  await record({ income: 42 });
  const dailyIncomeStat = fakeDailyMetric.features.get('income');
  assert.equal(dailyIncomeStat.count, 1);
  assert.equal(dailyIncomeStat.mean, 42);
});

test('a baseline computed under a stale scale version is reset, not blended with, on the next prediction', async () => {
  // Simulate a baseline that accumulated real stats (e.g. pre-DTIRatio-scale-fix
  // values) and was then frozen, tagged with an old scaleVersion -- exactly what
  // a document from before BASELINE_SCALE_VERSION existed/changed looks like.
  fakeBaseline.features.set('income', { count: 200, mean: 500000, m2: 999, min: 1, max: 1000000 });
  fakeBaseline.count = 200;
  fakeBaseline.isFrozen = true;
  fakeBaseline.scaleVersion = BASELINE_SCALE_VERSION - 1;

  await record({ income: 1000 });

  assert.equal(fakeBaseline.scaleVersion, BASELINE_SCALE_VERSION, 'baseline must be re-tagged to the current version');
  assert.equal(fakeBaseline.isFrozen, false, 'reset must unfreeze the baseline so it starts accumulating again');
  assert.equal(fakeBaseline.count, 1, 'reset must discard the old sample count, not add to it');
  assert.equal(
    fakeBaseline.features.get('income').mean,
    1000,
    'reset must discard the old (differently-scaled) running stats entirely'
  );
});

test('a baseline already on the current scale version is left untouched across calls', async () => {
  await record({ income: 1000 });
  await record({ income: 2000 });

  assert.equal(fakeBaseline.scaleVersion, BASELINE_SCALE_VERSION);
  assert.equal(fakeBaseline.count, 2, 'no spurious reset should occur when the version already matches');
});
