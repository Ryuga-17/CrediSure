/**
 * ML Service client -- calls the persistent FastAPI inference service
 * (ml_service/main.py) instead of spawning a fresh Python process per
 * prediction. The service preloads both models once at startup, so a
 * request here is just an HTTP round trip, not a process spawn + model load.
 */
const DEFAULT_TIMEOUT_MS = Number(process.env.ML_REQUEST_TIMEOUT_MS) || 30000;
const ML_SERVICE_URL = (process.env.ML_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, '');

class MLService {
  constructor() {
    this.predictUrl = `${ML_SERVICE_URL}/api/v1/predict`;
    this.requestCounter = 0;
  }

  buildRequestPayload(loanData) {
    return {
      requestId: `req_${Date.now()}_${this.requestCounter++}`,
      age: parseFloat(loanData.age),
      income: parseFloat(loanData.income),
      loanAmount: parseFloat(loanData.loanAmount),
      loanRate: parseFloat(loanData.loanRate),
      loanTerm: parseFloat(loanData.loanTerm),
      existingDebtPayment: parseFloat(loanData.existingDebtPayment || loanData.existingDebtPayments || 0),
      loanPurpose: loanData.loanPurpose,
      hasMortgage: Boolean(loanData.hasMortgage),
      hasDependents: Boolean(loanData.hasDependents),
      numBankAccounts: loanData.numBankAccounts !== undefined ? parseFloat(loanData.numBankAccounts) : 0,
      numCreditCards: loanData.numCreditCards !== undefined ? parseFloat(loanData.numCreditCards) : 0,
      numOfDelayedPayment: loanData.numOfDelayedPayment !== undefined ? parseFloat(loanData.numOfDelayedPayment) : 0,
      creditMix: loanData.creditMix || "Unknown"
    };
  }

  /**
   * Predict credit score and default status for a loan application
   * @param {Object} loanData - Loan application data
   * @returns {Promise<Object>} Prediction results with creditScore and defaultStatus
   */
  async predict(loanData, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    const body = this.buildRequestPayload(loanData);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(this.predictUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Prediction timed out after ${timeoutMs}ms`);
      }
      throw new Error(`Failed to reach ML service at ${ML_SERVICE_URL}: ${error.message}`);
    } finally {
      clearTimeout(timer);
    }

    let result;
    try {
      result = await response.json();
    } catch (error) {
      throw new Error(`Failed to parse ML service response: ${error.message}`);
    }

    if (!response.ok) {
      throw new Error(result?.detail || `ML service returned ${response.status}`);
    }
    if (!result.success) {
      throw new Error(result.error || 'Prediction failed');
    }

    return {
      creditScore: result.creditScore,
      creditScoreExplanation: result.creditScoreExplanation || [],
      defaultStatus: result.defaultStatus,
      defaultProbability: result.defaultProbability,
      riskBucket: result.riskBucket,
      explanationSummary: result.explanationSummary || [],
      preprocessingVersion: result.preprocessingVersion,
      modelVersions: result.modelVersions,
      rawFeatureRow: result.rawFeatureRow,
      // Provide business-friendly aliases for API response mapping
      credit_score: result.credit_score,
      credit_score_explanation: result.credit_score_explanation || [],
      probability_of_default: result.probability_of_default,
      risk_bucket: result.risk_bucket,
      explanation_summary: result.explanation_summary
    };
  }

  /** Kept so server.js's graceful-shutdown call site doesn't need to change --
   * there's no child process or open connection to tear down anymore. */
  shutdown() {}
}

module.exports = new MLService();
