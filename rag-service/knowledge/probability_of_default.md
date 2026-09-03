# Probability of Default (PD)

Probability of default is a number between 0 and 1 representing how likely
an applicant is to default on a loan (fail to repay as agreed). It comes
from a separate model from the credit score -- a LightGBM binary
classifier trained specifically to distinguish defaulting from
non-defaulting loans, using the applicant's age, income, loan amount,
interest rate, loan term, DTI ratio, loan purpose, and mortgage/dependents
status.

It deliberately does NOT use the credit score as an input, even though an
earlier version did. That chained the credit-score model's own prediction
into the PD model as a feature, which turned out to be a train/serve skew
(the credit-score model has no real signal in the training data, so at
serve time the PD model was seeing near-random values where training saw
the dataset's real CreditScore column). Removing it cost negligible
accuracy and eliminated that skew, so the two models are now fully
independent predictions from the same raw application data.

A PD of 0.05 means roughly a 5% estimated chance of default; a PD of 0.40
means a much higher estimated risk, around 40%. Because defaults are
relatively rare in the training data (about 1 in 9 loans), the model and
its decision threshold are specifically calibrated to still catch
high-risk applicants rather than defaulting to "predict no default" for
almost everyone, which would technically score well on raw accuracy while
being useless for actually flagging risk.

PD feeds into a simple risk bucket label (e.g. Low / Medium / High Risk)
that summarizes both the credit score and the default probability into a
single business-friendly category.
