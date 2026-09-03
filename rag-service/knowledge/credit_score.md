# Credit Score

A credit score in CrediSure is a number on a 300-850 scale, produced by a
LightGBM regression model trained on applicant and loan attributes. Higher
is better: it summarizes creditworthiness into a single number lenders can
compare across applicants.

Rough interpretation bands commonly used in the industry:
- 300-579: Poor
- 580-669: Fair
- 670-739: Good
- 740-799: Very Good
- 800-850: Excellent

A low score does not mean an application is automatically rejected -- it
is one input into the overall risk assessment, alongside the probability
of default and the applicant's debt-to-income ratio. Lenders typically use
the score alongside other factors like income stability and loan purpose
before making a final decision.
