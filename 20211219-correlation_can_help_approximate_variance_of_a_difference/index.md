# Correlation can help approximate variance of a difference

Even if random variables \\( \textbf{A} \\) and \\( \textbf{δ} \\) are
uncorrelated, realized data \\( A \\) and \\( \delta \\) will happen
to have some covariance. If \\( B = A + \delta \\), then \\(
\text{var}(B) = \text{var}(A) + \text{var}(\delta) + 2\text{cov}(A,
\delta) \\), and estimating any one variance by the others will be off
by the \\( 2\text{cov}(A, \delta) \\) term. For \\( \text{var}(\delta)
\\), however, the estimate \\( \text{var}(B)(1 - \text{corr}(A, B)^2)
\\) will usually be closer to correct, at the cost of being slightly
biased. (But don't forget that doing \\( \text{var}( \delta ) \\)
directly is a great first choice.)


### Three methods for \\( \text{var}( \delta ) \\), when \\( B = A + \delta \\)

The case of \\( B = A + \delta \\) (so that \\( \delta = B - A \\)) is
central to the paired t-test, for example. The variance of \\( A \\)
and \\( B \\) could each be large, but the variance of \\( \delta \\)
can still be small, making it easier to reject the null for \\(
\textbf{δ} \\), for example.

_Be careful: We're trying to estimate a variance, so we're interested
in the variance of the estimate of the variance, which can be
confusing. Hopefully the language is clear enough here._


#### 1) Variance of Differences

The obvious thing to do is to subtract and calculate the variance of
the differences: \\( \text{var}( \delta ) = \text{var}( B - A ) \\).
This is a good idea and what you should do. It's unbiased and has low
variance (for the estimate of the true variance of \\( \textbf{δ}
\\)).

Why not do it like this? Honestly I'm not sure. Maybe you don't have
complete data, and you're looking for a \\( \delta_1 - \delta_2 \\)
where the means of \\( A_1 \\) and \\( A_2 \\) are assumed equal so
you're using \\( B_1 - B_2 \\) but you want the (smaller) variance of
\\( \delta_1 - \delta_2 \\)? So you'll estimate some things with
complete cases even though the main effect is estimated with all \\( B
\\) data? Why not still use this method with the complete cases? Maybe
you're not using simple subtraction, but some more complex regression
with multiple variables? In that case, why not use variance of the
residuals directly? Do you just want a more complicated method?


#### 2) Difference of Variances

By the [variance sum law][], \\( \text{var}( \textbf{B} ) =
\text{var}( \textbf{A} ) + \text{var}( \textbf{δ} ) \\), if \\(
\textbf{A} \\) and \\( \textbf{δ} \\) are uncorrelated, so \\(
\text{var}( \textbf{δ} ) = \text{var}( \textbf{B} ) - \text{var}(
\textbf{A} ) \\). Real data is not generally perfectly uncorrelated,
however: \\( \text{var}(\delta) = \text{var}(B) - \text{var}(A) -
2\text{cov}(A, \delta) \\). The covariance term is zero in
expectation, so estimating \\( \text{var}(\delta) = \text{var}(B) -
\text{var}(A) \\) is unbiased. But the \\( 2\text{cov}(A, \delta) \\)
is a kind of noise term, and adds variance to the estimate of \\(
\text{var}( \textbf{δ} )\\).

[variance sum law]: /20201030-the_variance_sum_law_is_interesting/


#### 3) Using Correlation

It isn't obvious, but using \\( \text{var}(B)(1 - \text{corr}(A, B)^2)
\\) to estimate \\( \text{var}( \textbf{δ} ) \\) is much like using
the Difference of Variances, but with a generally smaller (but always
positive) error coming from \\( \text{cov}(A, \delta) \\). Proceeding
in small steps:

\\[ \text{var}(\delta) = \text{var}(B) - \text{var}(A) - 2\text{cov}(A, \delta) \\]

\\[ \text{var}(\delta) = \text{var}(B) - \left( \text{var}(A) + 2\text{cov}(A, \delta) \right) \\]

\\[ \text{var}(\delta) = \text{var}(B) \left( 1 - \frac{\text{var}(A) + 2\text{cov}(A, \delta)}{ \text{var}(B) } \right) \\]

\\[ \text{var}(\delta) = \text{var}(B) \left( 1 - \frac{\text{var}(A)^2 + 2\text{var}(A)\text{cov}(A, \delta)}{ \text{var}(A) \text{var}(B) } \right) \\]

This has been algebraic. Now add \\( \text{cov}(A, \delta)^2 \\) to
the fractional term's numerator. (This is an error in the estimate, to
get to the destination.)

\\[ \text{var}(\delta) = \text{var}(B) \left( 1 - \frac{\text{var}(A)^2 + 2\text{var}(A)\text{cov}(A, \delta) + \text{cov}(A, \delta)^2 }{ \text{var}(A) \text{var}(B) } \right) \\]

\\[ \text{var}(\delta) = \text{var}(B) \left( 1 - \frac{ ( \text{var}(A) + \text{cov}(A, \delta))^2 }{ \text{var}(A) \text{var}(B) } \right) \\]

The bit squared in the fraction's numerator is \\( \sum{(A_i - \bar{A}
)^2} + \sum{(A_i - \bar{A} )(\delta_i - \bar{\delta})} \\), which is
\\( \sum{(A_i - \bar{A})(A_i - \bar{A} + \delta_i - \bar{\delta})}
\\). Since \\( B_i = A_i + \delta_i \\) and \\( \bar{B} = \bar{A} +
\bar{\delta} \\), that's \\( \sum{(A_i - \bar{A})(B_i - \bar{B})} \\),
which is \\( \text{cov}(A, B) \\).

\\[ \text{var}(\delta) = \text{var}(B) \left( 1 - \frac{ \text{cov}(A, B)^2 }{ \text{var}(A) \text{var}(B) } \right) \\]

So at last, by definition:

\\[ \text{var}(\delta) = \text{var}(B) \left( 1 - \text{corr}(A, B)^2 \right) \\]

QED. The error introduced is \\( \text{cov}(A, \delta)^2 /
\text{var}(A) \\), which will tend to be considerably smaller in
absolute value than the \\( 2\text{cov}(A, \delta) \\) error in the
Difference of Variances method because \\( 0 \le |\text{cov}(A,
\delta)| / \text{var}(A) \ll 2 \\). This error is however positive in
expectation, so the estimate is biased: it will be slightly too small.


### Computational demonstration

Generating 1,000 datasets where each of \\( A \\) and \\( \delta \\)
have 100 values drawn at random from Gaussians with variance 9 and 16,
respectively, the three methods above generate estimates of \\(
\text{var}( \textbf{δ} ) \\) as follows:

```
| Method                  | Mean var(d) estimate | var(estimate) |
|-------------------------|----------------------|---------------|
| Variance of Differences |                15.98 |          5.10 |
| Difference of Variances |                15.95 |         10.69 |
| Using Correlation       |                15.82 |          5.12 |
```

As expected, the method Using Correlation comes out more below the
true value of 16 on average, but its variance is comparable to that of
the Variance of Differences.

The bias is already small with just 100 samples, and gets smaller
still as samples get bigger and sample correlations tend to be
smaller.


Here's clumsy [R][] code to do the experiment:

[R]: https://www.r-project.org/

```r
trials = 1000
samples = 100

set.seed(0)
est1 = c()
est2 = c()
est3 = c()

for (i in 1:trials) {
  A = rnorm(samples, sd=3)  # var=9
  d = rnorm(samples, sd=4)  # var=16
  B = A + d  # var=25, in population sense
  est1 = c(est1, var(B - A))  # same as var(d)
  est2 = c(est2, var(B) - var(A))
  est3 = c(est3, var(B) * (1 - cor(A, B)^2))
}

mean(est1)
## [1] 15.98799
mean(est2)
## [1] 15.9451
mean(est3)
## [1] 15.82234
var(est1)
## [1] 5.09602
var(est2)
## [1] 10.69393
var(est3)
## [1] 5.117983
```
