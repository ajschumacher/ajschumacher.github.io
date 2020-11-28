# Add variance to achieve a given correlation

If you have data _x_ and you want some data _y_ that has a given
[correlation][] _r_ with _x_, multiply _x_ by the sign of _r_ and then
add random noise with variance equal to the original variance over the
square of the desired correlation, minus the original variance.

[correlation]: https://en.wikipedia.org/wiki/Pearson_correlation_coefficient

You can do this in [R], for example:

[R]: https://www.r-project.org/

<!-- set.seed(27)  -->

```r
correlated <- function(x, r) {
  return(x * sign(r) + rnorm(length(x), sd=sqrt(var(x)/r^2 - var(x))))
}

x <- rnorm(100)
cor(x, correlated(x, 0.75))
## [1] 0.7537228
```

The resulting correlation is only equal to the desired value in
expectation; you can tweak a value in the result to make it more exact
if you like, or use a [more sophisticated method][].

[more sophisticated method]: https://stat.ethz.ch/pipermail/r-help/2007-April/128925.html

The method here works because of the relationship between correlation
and [coefficient of determination][] which holds here, and of course
the [variance sum law][].

[coefficient of determination]: https://en.wikipedia.org/wiki/Coefficient_of_determination
[variance sum law]: /20201030-the_variance_sum_law_is_interesting/

\\[ r^2 = R^2 = 1 - \frac{ \sigma^2_\text{noise} }{ \sigma^2_{x + \text{noise}} } = \frac{ \sigma^2_x }{ \sigma^2_x + \sigma^2_\text{noise} } \\]

\\[ \sigma^2_\text{noise} = \frac{\sigma^2_x}{r^2} - \sigma^2_x \\]

The question of how to do this came up years ago at an old job I had.
I don't recall anybody coming up with a solution, back then. Live and
learn!

If you're generating all the data yourself, it's easier to use a
multi-dimensional random generator. The [MASS][] package's [mvrnorm][]
function has an `empirical` flag which can even make things work out
exactly (rather than just in expectation). And if you need more new
variables that relate to existing data, you probably want a
[more sophisticated method][].

[MASS]: https://cran.r-project.org/web/packages/MASS/index.html
[mvrnorm]: https://www.rdocumentation.org/packages/MASS/versions/7.3-53/topics/mvrnorm
