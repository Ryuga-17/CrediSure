const { spawn } = require('child_process');
const path = require('path');

/**
 * ML Service for making predictions using Python models
 */
class MLService {
  constructor() {
    this.pythonScriptPath = path.join(__dirname, 'mlPredictor.py');
  }

  /**
   * Predict credit score and default status for a loan application
   * @param {Object} loanData - Loan application data
   * @returns {Promise<Object>} Prediction results with creditScore and defaultStatus
   */
  async predict(loanData) {
    return new Promise((resolve, reject) => {
      // Prepare input data
      const inputData = {
        action: 'predict',
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

      // Determine Python command (try python3 first, then python)
      const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
      
      // Spawn Python process
      const pythonProcess = spawn(pythonCommand, [this.pythonScriptPath]);
      
      let output = '';
      let errorOutput = '';

      // Collect stdout
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      // Collect stderr
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python script exited with code ${code}. Error: ${errorOutput || 'Unknown error'}`));
          return;
        }

        try {
          if (!output) {
            reject(new Error('No output from Python script'));
            return;
          }

          const result = JSON.parse(output.trim());
          
          if (!result.success) {
            reject(new Error(result.error || 'Prediction failed'));
            return;
          }

          resolve({
            creditScore: result.creditScore,
            defaultStatus: result.defaultStatus,
            defaultProbability: result.defaultProbability
          });
        } catch (parseError) {
          reject(new Error(`Failed to parse prediction result: ${parseError.message}. Output: ${output}. Error: ${errorOutput}`));
        }
      });

      // Handle process errors
      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}. Make sure Python 3 is installed.`));
      });

      // Send input data to Python script
      pythonProcess.stdin.write(JSON.stringify(inputData));
      pythonProcess.stdin.end();
    });
  }
}

module.exports = new MLService();
