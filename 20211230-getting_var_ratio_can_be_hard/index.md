# Getting `var(X/Y)` can be hard

There generally isn't an analytic solution for the variance of the
ratio of two random variables (or probability distributions).
Denominators around zero are a problem, and with variance large
relative to mean, the approximation using the delta method may be
worse than you expect.


If you're dividing by something that can be close to zero, the results
can get big, which affects variance. Dividing two standard normal
distributions gives you a [Cauchy distribution][], for example, and
the variance there is undefined. So if you're near zero, watch out!
Variance may not make sense, and can at least be hard to estimate.

[Cauchy distribution]: https://en.wikipedia.org/wiki/Cauchy_distribution "Wikipediia: Cauchy distribution"


The approximation of the variance of a ratio using the
[delta method][] is:

\\[ \text{var} \left( \frac{X}{Y} \right) \approx \frac{1}{\overline{Y}^2} \text{var} \left( X \right) + \frac{ \overline{X}^2 }{ \overline{Y}^4 } \text{var} \left( Y \right) - 2 \frac{ \overline{X} }{ \overline{Y}^3 } \text{cov} \left( X, Y \right) \\]

See [Seltman][] for a derivation. Also presented in [Kohavi et al.][]
and [Deng et al.][]

[delta method]: https://en.wikipedia.org/wiki/Delta_method "Delta method"
[Seltman]: https://www.stat.cmu.edu/~hseltman/files/ratio.pdf "Approximations for Mean and Variance of a Ratio"
[Kohavi et al.]: /20211229-trustworthy_online_controlled_experiments/ "Trustworthy Online Controlled Experiments"
[Deng et al.]: http://alexdeng.github.io/public/files/WSDM2017draft.pdf "Trustworthy analysis of online A/B tests: Pitfalls, challenges and solutions"


This is an approximation based on [Taylor series expansion][], and it
isn't always super close, even for seemingly simple examples like this
one in [R][], with uniform distributions:

[Taylor series expansion]: https://en.wikipedia.org/wiki/Taylor%27s_theorem "Wikipedia: Taylor's theorem"
[R]: https://www.r-project.org/ "The R Project for Statistical Computing"


<!-- set.seed(42) -->

```r
approx_var_ratio <- function(x, y) {
  (1 / mean(y)^2) * var(x) +
    (mean(x)^2 / mean(y)^4) * var(y) -
    2 * (mean(x) / mean(y)^3) * cov(x, y)
}

x = runif(1000, min=14, max=26)
y = runif(1000, min= 4, max=16)

approx_var_ratio(x, y)
## 0.6286227
var(x/y)
## 1.189362
```

That's no fluke of sampling. The delta-based formula is consistently
under 60% of the empirical value, for these parameters.


It isn't just a weirdness of the uniform distribution either. The
approximation is agnostic to distribution—which is another hint that
it can't be perfectly right, at least not always. Here's an example
with Gaussians, truncated so there's no risk of outliers near zero:

<!--
install.packages("truncnorm")
library(truncnorm)

set.seed(42)
-->

```r
x = rtruncnorm(1000, a=14, mean=20, b=26, sd=3)
y = rtruncnorm(1000, a= 4, mean=10, b=16, sd=3)

approx_var_ratio(x, y)
## 0.3323209
var(x/y)
## 0.5294384
```

That's still a substantial underestimate.


The approximation gets better when means are bigger relative to
variances. For example:

<!-- set.seed(42) -->

```r
x = rnorm(1000, mean=200, sd=3)
y = rnorm(1000, mean=100, sd=3)

approx_var_ratio(x, y)
## 0.004369166
var(x/y)
## 0.004381438
```

Now it's quite close.


A distribution with appreciable mass near zero has a large variance
relative to its mean, but you don't have to be near zero for the
relative spread of the distribution to affect the quality of the
approximation. Especially clear of zero, I think Monte Carlo
estimation can be better than using the formula based on the delta
method.


In conclusion, approximations are approximations. Do you really _need_
a ratio?

Stay safe out there!
