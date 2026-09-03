# Reading SHAP Explanations

Every credit score and default-probability prediction in CrediSure comes
with a SHAP (SHapley Additive exPlanations) breakdown, showing which input
features pushed the prediction up or down, and by how much.

Each entry in the explanation has three parts:
- **feature**: which input drove this part of the prediction (e.g. Age,
  Income, DTIRatio*InterestRate, LoanPurpose).
- **impact**: a signed number showing how much that feature moved the
  prediction, in the same units as the prediction itself (credit-score
  points, or probability for the default model).
- **direction**: "increases" if the impact is positive, "decreases" if
  negative.

The explanations are additive: the model's baseline output plus the sum of
every feature's impact equals the final prediction. That means the
magnitude of each impact is directly comparable -- a feature with impact
+40 mattered roughly twice as much as one with impact +20, in the same
direction.

Impacts are computed per-application, not as generic "important features
overall" -- the same feature can have a large impact for one applicant and
a near-zero impact for another, depending on their specific values.
