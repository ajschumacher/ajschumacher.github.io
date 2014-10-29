# R-Squared and Adjusted R-Squared for a Linear Model



We would like to make a linear model such that the residuals - how far off the predictions of the model are, for the training data - are small. If the residuals are small, the model is doing a good job of predicting. We're always minimizing the residuals, with <a href="http://en.wikipedia.org/wiki/Ordinary_least_squares">OLS</a>, but how can we tell if, in the end, the residuals are small?

We can measure the "bigness" of the residuals by their <a href="http://en.wikipedia.org/wiki/Variance">variance</a>. Note that residuals will never be big numbers and yet have small variance, because if that happened we would change the linear model to further minimize the residuals. For example, if the residuals are all one, just add one to the constant term of the model and you reduce all the residuals to zero.

We want our measure of residual smallness to be the same regardless of whether we're working in light-years or millimeters, so we need to scale by something. We scale by the variance of the values we're predicting (the labels).

So now we have a measure of residual smallness that is equal to zero if all the residuals are zero and the model is "perfect", and equal to one if the model is constant (this is easy to see if, for example, the model always predicts that the label is zero). This measure of residual smallness is then in some sense the percentage of variance (in the labels) that the model does not explain (it's still in the residuals).

We would usually prefer to talk about a measure that gets bigger when we do a better job, so we take one and subtract the measure of residual smallness to get $latex R^2$, the percentage of variance explained. (Consider how you might try to define this differently.)

$latex R^2 = 1 - \frac{var(residuals)}{var(labels)}$

It turns out that if you add a bunch of random predictors to a model you can get $latex R^2$ to go up and up without having it mean anything. Adjusted R-Squared tries to account for this by penalizing the measure when there are more predictors $latex p$ (not counting the constant term), relative to the number of training examples $latex n$.

adjusted&#160;$latex R^2 = 1 - \frac{var(residuals)}{var(labels)} \cdot \frac{n-1}{n-p-1}$

When $latex p$ gets bigger, that denominator gets smaller, so a larger thing is subtracted, so adjusted $latex R^2$ goes down. Adjusted $latex R^2$ should help discourage you from adding predictors all willy-nilly. (Could you have a negative adjusted $latex R^2$? Could you have an adjusted $latex R^2$ greater than one? Play around with these ideas. Try it in R.)

Note one: <a href="http://en.wikipedia.org/wiki/Coefficient_of_determination">this</a> $latex R^2$ is quite related to <a href="http://en.wikipedia.org/wiki/Pearson_product-moment_correlation_coefficient">this</a> $latex r$ squared.

Note two: this $latex R^2$ is a measure of training error. Often you'll be more concerned with how the model performs on data it wasn't created with.



*This post was originally hosted elsewhere.*
