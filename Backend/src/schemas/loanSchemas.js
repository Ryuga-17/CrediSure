const { checkSchema } = require("express-validator");

const loanRequestSchema = checkSchema({
  name: {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: "Name is required"
  },
  age: {
    in: ["body"],
    isFloat: { options: { min: 0 } },
    toFloat: true,
    errorMessage: "Age must be a positive number"
  },
  income: {
    in: ["body"],
    // Must be strictly > 0: the scoring pipeline divides by income
    // (LoanAmount/Income feature engineering), so 0 or negative values
    // produce an undefined result rather than a real score. See CRIT-2.
    isFloat: { options: { min: 0.01 } },
    toFloat: true,
    errorMessage: "Income must be greater than 0"
  },
  existingDebtPayment: {
    in: ["body"],
    optional: true,
    isFloat: { options: { min: 0 } },
    toFloat: true,
    errorMessage: "Existing debt payment must be a positive number"
  },
  loanAmount: {
    in: ["body"],
    isFloat: { options: { min: 0 } },
    toFloat: true,
    errorMessage: "Loan amount must be a positive number"
  },
  loanRate: {
    in: ["body"],
    isFloat: { options: { min: 0 } },
    toFloat: true,
    errorMessage: "Loan rate must be a positive number"
  },
  loanTerm: {
    in: ["body"],
    isFloat: { options: { min: 0 } },
    toFloat: true,
    errorMessage: "Loan term must be a positive number"
  },
  loanPurpose: {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: "Loan purpose is required"
  },
  hasDependents: {
    in: ["body"],
    optional: true,
    isBoolean: true,
    toBoolean: true
  },
  hasMortgage: {
    in: ["body"],
    optional: true,
    isBoolean: true,
    toBoolean: true
  },
  numBankAccounts: {
    in: ["body"],
    optional: true,
    isInt: { options: { min: 0 } },
    toInt: true
  },
  numCreditCards: {
    in: ["body"],
    optional: true,
    isInt: { options: { min: 0 } },
    toInt: true
  },
  numOfDelayedPayment: {
    in: ["body"],
    optional: true,
    isInt: { options: { min: 0 } },
    toInt: true
  },
  creditMix: {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true
  }
});

module.exports = {
  loanRequestSchema,
  predictionResponseSchema: {
    creditScore: "string",
    defaultProbability: "number",
    riskBucket: "string",
    explanationSummary: "array",
    preprocessingVersion: "string",
    modelVersions: "object",
    credit_score: "string",
    probability_of_default: "number",
    risk_bucket: "string",
    explanation_summary: "array"
  }
};
