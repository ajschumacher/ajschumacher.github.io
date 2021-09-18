# Weight of Evidence is logistic coefficients

“Weight of Evidence” (WoE) is a [good idea][] for decision-making,
but, especially in the financial risk modeling world, it's also a
specific feature processing [method][] based on [target statistics][].
Weight of Evidence changes a categorical variable into the log odds
coefficients corresponding to a logistic regression with intercept at
the overall rate.

[good idea]: https://www.endocrinescience.org/glossary/weight-of-evidence-woe/ "Weight of evidence refers to a systematic approach that scientists use to evaluate the totality of scientific evidence to assess if the science supports a particular conclusion."
[method]: https://contrib.scikit-learn.org/category_encoders/woe.html
[target statistics]: http://helios.mm.di.uoa.gr/~rouvas/ssi/sigkdd/sigkdd.vol3.1/barreca.pdf


Say you have a categorical predictor, or a continuous predictor that
you're going to bin into categories in order to make it easier to
model nonlinear relationships, and a binary outcome like “defaulted on
loan or not”. Then for each category, the WoE score is:


\\[ \text{WoE} =
    \log \left( \frac{\text{count of positives for this category} /
                      \text{count of all positives}}
                     {\text{count of negatives for this category} /
                      \text{count of all negatives}} \right) \\]


```python
import numpy as np
import pandas as pd
import category_encoders as ce

X = pd.DataFrame({'x': ['a', 'a', 'a', 'a', 'b', 'b', 'b', 'b']})
y =                    [ 1 ,  1 ,  0 ,  0 ,  1 ,  0 ,  0 ,  0 ]

woe = ce.woe.WOEEncoder(regularization=0)
woe.fit(X, y)
woe.transform(pd.DataFrame({'x': ['a', 'b']}))
## (0.5108256237659906, -0.587786664902119)

np.log((2/3)/(2/5)), np.log((1/3)/(3/5))
## (0.5108256237659906, -0.587786664902119)
```


It's usually written [like][] [that][], sometimes with additive
smoothing (add some small numbers to the counts) to avoid zeros and
reduce variance. To make it even clearer that this is just
[log odds][], rearrange to:

[like]: https://www.listendata.com/2015/03/weight-of-evidence-woe-and-information.html
[that]: https://docs.tibco.com/data-science/GUID-44739B00-E85F-4CE7-8404-24F9B775ADE8.html
[log odds]: https://en.wikipedia.org/wiki/Logit


\\[ \text{WoE} =
    \log \left( \frac{\text{count of positives for this category}}
                     {\text{count of negatives for this category}} \right) -
    \log \left( \frac{\text{count of all positives}}
                     {\text{count of all negatives}} \right) \\]


```python
np.log(2/2) - np.log(3/5), np.log(1/3) - np.log(3/5)
## (0.5108256237659907, -0.5877866649021191)
```


The WoE values are exactly the coefficients you'd get if you
[made indicator columns][] for your categorical variable, added an
intercept column, and did a logistic regression. That design matrix
isn't full rank, so there isn't a unique solution—unless you set the
intercept coefficient to represent the overall log odds (as in the
subtracted term above).

[made indicator columns]: https://pandas.pydata.org/docs/reference/api/pandas.get_dummies.html


These WoE scores are monotonic with the category-specific percent
positive, for example, so if you're going to use a tree-based model
where spacing doesn't matter, the more immediately interpretable value
might be preferable. If you're doing a simple logistic regression with
a WoE predictor, the coefficient will be one. In combination with
other features, it isn't obvious to me that WoE will always be an
absolutely optimal transform, but it seems like a fine choice for
multiple logistic regression as well. Using WoE instead of a
categorical feature can prevent learning interactions with the
affected categories, etc., which could be a consideration.


Like other transforms based on target statistics, WoE can leak label
information into training data. Even in large datasets, if some
categories appear rarely, this may be a problem. Cranking up the
additive smoothing (["regularization"][]) a bit might help, or
consider alternatives as in the [CatBoost paper][] etc.

["regularization"]: https://contrib.scikit-learn.org/category_encoders/woe.html
[CatBoost paper]: https://arxiv.org/abs/1706.09516


I think WoE is interesting in part because it's sort of on the
threshold between a simple pre-processing step and what might be
considered model stacking. It's a reminder that even “fancy” models
are just statistics with more steps; the mean is a model too.


---

If you're working on credit scoring, maybe you'll also do feature
selection using “Information Value” ([IV][]). I don't know... It
reminds me a little bit of [MIC][], almost? That's not quite right.
I'm not so interested in IV right now.

[IV]: https://www.lexjansen.com/mwsug/2013/AA/MWSUG-2013-AA14.pdf
[MIC]: /2013/02/05/finding-the-mic-of-a-circle/
