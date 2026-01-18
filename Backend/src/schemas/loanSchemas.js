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
    isFloat: { options: { min: 0 } },
    toFloat: true,
    errorMessage: "Income must be a positive number"
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
  }
});

module.exports = {
  loanRequestSchema,
  predictionResponseSchema: {
    creditScore: "number",
    defaultProbability: "number",
    riskBucket: "string",
    explanationSummary: "array",
    preprocessingVersion: "string",
    modelVersions: "object",
    credit_score: "number",
    probability_of_default: "number",
    risk_bucket: "string",
    explanation_summary: "array"
  }
};
