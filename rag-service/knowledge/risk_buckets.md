# Risk Buckets

CrediSure translates the raw *probability of default* (a number between 0
and 1) into one of three plain-language risk buckets, so the result is
easier to act on than a bare probability:

- **Low Risk**: probability of default below the PD model's own decision
  threshold (currently 17%, tuned for the training data's roughly 88/12
  non-default/default split -- see the probability-of-default doc).
- **Medium Risk**: probability of default between that decision threshold
  and 50%.
- **High Risk**: probability of default at or above 50%.

The Low Risk cutoff intentionally matches the decision threshold exactly,
not an independent round number: it's the same cutoff that decides whether
an application is predicted to default at all, so "Low Risk" always means
"predicted non-default." The 50% cutoff for High Risk is an independent,
fixed choice ("more likely than not to default") that doesn't move when the
model is recalibrated.

A risk bucket is a summary, not the whole picture: two applications in the
same bucket can still have meaningfully different default probabilities
(e.g. 20% vs 48% both count as "Medium Risk"). The *explanation summary*
(SHAP-based top risk drivers) is what shows why a specific applicant landed
where they did, on top of the bucket itself.
