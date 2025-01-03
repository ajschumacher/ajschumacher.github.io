# Regression standard errors scale by all residuals

Even in cases where it seems like it shouldn't matter whether you run
individual regressions or a combined regression, it does matter to the
standard errors, because the standard errors all scale by a factor
that includes all the residuals for the model.

Here's a simple data set in [R](https://www.r-project.org/):

```r
set.seed(42)
x = rnorm(10)
df_a = data.frame(group='a', x=x, y=2*x + 5 + rnorm(10))
x = rnorm(10)
df_b = data.frame(group='b', x=x, y=3*x + 7 + rnorm(10))
df = rbind(df_a, df_b)
df
##     group           x          y
##  1      a  1.37095845  9.0467865
##  2      a -0.56469817  6.1572490
##  3      a  0.36312841  4.3373961
##  4      a  0.63286260  5.9869364
##  5      a  0.40426832  5.6752153
##  6      a -0.10612452  5.4237014
##  7      a  1.51152200  7.7387911
##  8      a -0.09465904  2.1542265
##  9      a  2.01842371  6.5963805
##  10     a -0.06271410  6.1946851
##  11     b -0.30663859  6.5355343
##  12     b -1.78130843  2.3609120
##  13     b -0.17191736  7.5193515
##  14     b  1.21467470 10.0350977
##  15     b  1.89519346 13.1905355
##  16     b -0.43046913  3.9915839
##  17     b -0.25726938  5.4437328
##  18     b -1.76316309  0.8596032
##  19     b  0.46009735  5.9660844
##  20     b -0.63999488  5.1161380
```

If we're trying to recover the slopes and intercepts, we can run
separate regressions for group _a_ and group _b_, or we can run a
combined regression for both at the same time.

```r
summary(lm(y ~ x, data=df_a))
##              Estimate Std. Error t value Pr(>|t|)
##  (Intercept)   5.2370     0.6162   8.500 2.82e-05 ***
##  x             1.2682     0.6397   1.983   0.0827 .
summary(lm(y ~ x, data=df_b))
##              Estimate Std. Error t value Pr(>|t|)
##  (Intercept)   6.6258     0.3783  17.515 1.15e-07 ***
##  x             2.9421     0.3405   8.641 2.50e-05 ***
summary(lm(y ~ group:x + group - 1, data=df))
##              Estimate Std. Error t value Pr(>|t|)
##     groupa     5.2370     0.5411   9.679 4.32e-08 ***
##     groupb     6.6258     0.4511  14.689 1.05e-10 ***
##     groupa:x   1.2682     0.5618   2.258   0.0383 *
##     groupb:x   2.9421     0.4060   7.247 1.95e-06 ***
```

The estimated coefficients are the same between the two methods
(good!) but the standard errors are different. Why? We know that the
data for group _a_ doesn't really interact with the data for group _b_
at all, so it shouldn't affect the standard errors, right?

Indeed, adding extra independent data shouldn't affect the standard
errors, but regression doesn't know about the independence. (Run the
independent regressions, not the combined one, in cases like this if
you want correct standard errors.)

With \\( X \\) the design matrix and \\( \sigma^2 \\) the sum of
squared residuals divided by degrees of freedom, the standard errors
are \\( \sqrt{ \sigma^2 \( X^TX \)^{-1} } \\). (Thanks to [ocram][].)

[ocram]: https://stats.stackexchange.com/a/44841/122282 "How are the standard errors of coefficients calculated in a regression?"

```r
model = lm(y ~ group:x + group - 1, data=df)
matrix = model.matrix(y ~ group:x + group - 1, data=df)
sqrt(diag((sum(model$residuals^2) / 16) * solve(t(matrix) %*% matrix)))
##     groupa    groupb  groupa:x  groupb:x
##  0.5410892 0.4510810 0.5617751 0.4059782
```

In the example here, the group _a_ coefficient on _x_ isn't
significant (at 0.05) with the individual regression, but it appears
to be when the combined regression is done. And this is a modest
example, with the same scale normal noise in both data sets; data
won't be so homoscedastic in general so results could be even worse
for combined regressions.
