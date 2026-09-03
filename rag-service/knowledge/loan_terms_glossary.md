# Loan Terms Glossary

Quick reference for the fields on CrediSure's loan application form and
elsewhere in the app.

- **Principal / Loan Amount**: the amount of money being borrowed, before
  interest.
- **Loan Rate (Interest Rate)**: the annual percentage charged on the
  outstanding principal. A higher rate means higher total repayment for the
  same principal and term.
- **Loan Term**: how long the borrower has to repay the loan, in years.
  Longer terms usually mean lower monthly payments but more interest paid
  overall.
- **Loan Purpose**: what the loan is for (e.g. Business, Home, Education,
  Automobile, Others). Some purposes carry different typical risk profiles
  in lending data, which is why the model uses it as a feature.
- **Existing Debt Payment**: the applicant's current monthly debt
  obligations, used to compute the debt-to-income ratio.
- **Has Mortgage / Has Dependents**: yes/no flags describing the applicant's
  existing financial obligations, both used as model features.
- **Income**: the applicant's income, used both directly and as the
  denominator of the debt-to-income ratio.
- **Age**: the applicant's age, used as a model feature.

These are the raw inputs; CrediSure's models turn them into a *credit
score* and a *probability of default* -- see the other knowledge docs for
what those outputs mean.
