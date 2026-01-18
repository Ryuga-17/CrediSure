const { spawn } = require('child_process');
const path = require('path');

/**
 * ML Service for making predictions using Python models
 */
class MLService {
  constructor() {
    this.pythonScriptPath = path.join(__dirname, 'mlPredictor.py');
    this.pythonProcess = null;
    this.stdoutBuffer = '';
    this.pendingRequests = new Map();
    this.requestCounter = 0;
  }

  startProcess() {
    if (this.pythonProcess) {
      return;
    }

    // Keep a single Python process so models stay warm and inference stays stateless per request.
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
    this.pythonProcess = spawn(pythonCommand, [this.pythonScriptPath], {
      env: { ...process.env, ML_STREAM_MODE: 'true' }
    });

    this.pythonProcess.stdout.on('data', (data) => {
      this.stdoutBuffer += data.toString();
      const lines = this.stdoutBuffer.split('\n');
      this.stdoutBuffer = lines.pop() || '';

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return;
        }
        try {
          const result = JSON.parse(trimmed);
          const requestId = result.requestId || result.request_id;
          const pending = requestId ? this.pendingRequests.get(requestId) : null;
          if (!pending) {
            return;
          }
          this.pendingRequests.delete(requestId);

          if (!result.success) {
            pending.reject(new Error(result.error || 'Prediction failed'));
            return;
          }

          pending.resolve({
            creditScore: result.creditScore,
            defaultStatus: result.defaultStatus,
            defaultProbability: result.defaultProbability,
            riskBucket: result.riskBucket,
            explanationSummary: result.explanationSummary || [],
            preprocessingVersion: result.preprocessingVersion,
            modelVersions: result.modelVersions,
            rawFeatureRow: result.rawFeatureRow,
            // Provide business-friendly aliases for API response mapping
            credit_score: result.credit_score,
            probability_of_default: result.probability_of_default,
            risk_bucket: result.risk_bucket,
            explanation_summary: result.explanation_summary
          });
        } catch (error) {
          // If parsing fails, drop the line and let the caller handle timeout.
          console.error('Failed to parse ML response:', error);
        }
      });
    });

    this.pythonProcess.stderr.on('data', (data) => {
      console.error('ML stderr:', data.toString());
    });

    this.pythonProcess.on('close', (code) => {
      const error = new Error(`Python process exited with code ${code}`);
      this.pendingRequests.forEach((pending) => pending.reject(error));
      this.pendingRequests.clear();
      this.pythonProcess = null;
    });

    this.pythonProcess.on('error', (error) => {
      const wrapped = new Error(`Failed to start Python process: ${error.message}. Make sure Python 3 is installed.`);
      this.pendingRequests.forEach((pending) => pending.reject(wrapped));
      this.pendingRequests.clear();
      this.pythonProcess = null;
    });
  }

  buildRequestPayload(loanData) {
    return {
      action: 'predict',
      request_id: `req_${Date.now()}_${this.requestCounter++}`,
      data: {
        age: parseFloat(loanData.age),
        income: parseFloat(loanData.income),
        loanAmount: parseFloat(loanData.loanAmount),
        loanRate: parseFloat(loanData.loanRate),
        loanTerm: parseFloat(loanData.loanTerm),
        existingDebtPayment: parseFloat(loanData.existingDebtPayment || loanData.existingDebtPayments || 0),
        loanPurpose: loanData.loanPurpose,
        hasMortgage: Boolean(loanData.hasMortgage),
        hasDependents: Boolean(loanData.hasDependents)
      }
    };
  }

  /**
   * Predict credit score and default status for a loan application
   * @param {Object} loanData - Loan application data
   * @returns {Promise<Object>} Prediction results with creditScore and defaultStatus
   */
  async predict(loanData) {
    return new Promise((resolve, reject) => {
      this.startProcess();
      const inputData = this.buildRequestPayload(loanData);

      this.pendingRequests.set(inputData.request_id, { resolve, reject });
      this.pythonProcess.stdin.write(`${JSON.stringify(inputData)}\n`);
    });
  }
}

module.exports = new MLService();
