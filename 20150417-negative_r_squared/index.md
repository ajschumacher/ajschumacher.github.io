# R Squared Can Be Negative

Let's do a little linear regression in Python with [scikit-learn](http://scikit-learn.org/):

```Python
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.cross_validation import train_test_split

X, y = np.random.randn(100, 20), np.random.randn(100)
X_train, X_test, y_train, y_test = train_test_split(X, y, random_state=42)

model = LinearRegression()
model.fit(X_train, y_train)
```

It is a property of [ordinary least squares regression](http://en.wikipedia.org/wiki/Ordinary_least_squares) that for the data we fit (the training data) the [coefficient of determination](http://en.wikipedia.org/wiki/Coefficient_of_determination) (R<sup>2</sup>) and squared [correlation coefficient](http://en.wikipedia.org/wiki/Pearson_product-moment_correlation_coefficient) (r<sup>2</sup>) of the model's predictions with the actual data are equal.

```Python
# coefficient of determination R^2
print model.score(X_train, y_train)
## 0.203942898079

# squared correlation coefficient r^2
print np.corrcoef(model.predict(X_train), y_train)[0, 1]**2
## 0.203942898079
```

This does not hold for new data, and if our model is sufficiently bad the coefficient of determination can be negative. The squared correlation coefficient is never negative but can be quite low.

```Python
# coefficient of determination R^2
print model.score(X_test,  y_test)
## -0.277742673311

# squared correlation coefficient r^2
print np.corrcoef(model.predict(X_test), y_test)[0, 1]**2
## 0.0266856746214
```

This is [overfitting](http://en.wikipedia.org/wiki/Overfitting).
