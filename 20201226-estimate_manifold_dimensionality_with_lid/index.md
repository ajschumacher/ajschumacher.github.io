# Estimate manifold dimensionality with LID

Local Intrinsic Dimensionality (LID) is based on assuming locally
uniform density and using the geometric idea that in \\( D \\)
dimensions the volume of a ball with radius \\( r \\) goes as \\( r^D
\\). With an outer radius \\( r_{\text{bound}} \\) from some point and
a distance \\( r \lt r_{\text{bound}} \\) to a neighboring point, the
maximum likelihood estimator of LID is \\( 1 / \log{\left(
r_{\text{bound}}/r \right)} \\), and multiple estimates are averaged
with the harmonic mean.


<a href="https://www.researchgate.net/publication/200688576_Non-linear_scaling_techniques_for_uncovering_the_perceptual_dimensions_of_timbre/figures"><img src="swiss_roll.jpg" style="float: right; margin-left: 1em;" /></a>

For example, Swiss roll data curves through three dimensions but only
on a two-dimensional manifold. LID for the three-dimensional Swiss
roll data is about two, which is informative.

 * [Calculating LID with Python](#calculating)
     * [In a cloud of points](#cloud)
     * [For a Swiss roll dataset](#roll)
 * [Mathematical derivation of LID](#derivation)
     * [Cumulative Distribution Function (CDF) of radius](#cdf)
     * [Probability Density Function (PDF) of radius](#pdf)
     * [Expected Value of radius](#ev)
     * [Maximum Likelihood Estimate of dimension](#mle)
     * [Harmonic mean for dimensionality](#harmonic)
 * [Comparison to selected literature](#literature)
     * [Characterizing Adversarial Subspaces](#subspaces)
     * [Minimal Neighborhood Information](#minimal)
 * [Topological extensions of LID](#topological)


### <a name="calculating" href="#calculating">Calculating LID with Python</a>

The maximum likelihood estimator of Local Intrinsic Dimensionality is
\\( 1 / \log{\left( r_{\text{bound}}/r \right)} \\).

```python
import math

def lid(radius, radius_bound):
    return 1 / math.log(radius_bound / radius)
```

The radii will be distances measured from data using
[Euclidean distance][].

[Euclidean distance]: https://en.wikipedia.org/wiki/Euclidean_distance

```python
def euclidean(xs, ys):  # Euclidean distance
    return math.sqrt(sum((x - y)**2 for x, y in zip(xs, ys)))
```

To average multiple estimates of dimensionality, use the
[harmonic mean][].

[harmonic mean]: https://en.wikipedia.org/wiki/Harmonic_mean

```python
def harmonic_mean(numbers):
    return len(numbers) / sum(1 / number for number in numbers)
```

Filter out zeros (such as the distance from a point to itself).

```python
def positive(numbers):
    return [number for number in numbers if number > 0]
```

For a point in some data, find the distances to its \\( k+1 \\)
nearest neighbors. The greatest of these is \\( r_{\text{bound}} \\),
and the estimates based on the \\( k \\) nearest neighbors are
averaged.

```python
def neighbors_lid(origin, points, k=1, distance=euclidean):
    radii = sorted(positive([distance(origin, point) for point in points]))
    return harmonic_mean([lid(radius, radii[k]) for radius in radii[:k]])
```


#### <a name="cloud" href="#cloud">In a cloud of points</a>

A random cloud of points in \\( D \\) dimensions has dimensionality
equal to \\( D \\).

```python
import random

def cloud(dimensions, count=100, bounds=(-1, 1)):
    return [[random.uniform(*bounds) for _ in range(dimensions)]
            for _ in range(count)]
```

LID can be calculated from anywhere in the cloud, such as the origin,
as in this seven-dimensional example.

```python
neighbors_lid([0]*7, cloud(7))
## 6.851551579378687
```

These estimates are very noisy; it's very likely that a given run
won't be so close to seven. Repeating the experiment many times is
more reassuring.

```python
harmonic_mean([neighbors_lid([0]*7, cloud(7)) for _ in range(1000)])
## 7.006859728132216
```


#### <a name="roll" href="#roll">For a Swiss roll dataset</a>

To estimate a dataset's dimensionality, average LID from each point in
the dataset.

```python
def data_lid(points, k=1, distance=euclidean):
    return harmonic_mean([neighbors_lid(point, points, k=k, distance=distance)
                          for point in points])
```

[Swiss roll][] data, first introduced in the [Isomap paper][], is a
two-dimensional [manifold][] embedded in three dimensions. It's not
terribly hard to make from scratch, but the
[scikit-learn implementation][] is convenient.

[Swiss roll]: https://en.wikipedia.org/wiki/Swiss_roll
[Isomap paper]: https://web.mit.edu/cocosci/Papers/sci_reprint.pdf
[manifold]: https://en.wikipedia.org/wiki/Manifold
[scikit-learn implementation]: https://github.com/scikit-learn/scikit-learn/blob/42aff4e2e/sklearn/datasets/_samples_generator.py#L1402

[![swiss roll](swiss_roll.jpg)](https://www.researchgate.net/publication/200688576_Non-linear_scaling_techniques_for_uncovering_the_perceptual_dimensions_of_timbre)

```python
import sklearn.datasets

roll, _ = sklearn.datasets.make_swiss_roll()
data_lid(roll)
## 2.0706005383894444
```

The code here is also available in a [notebook][] with slightly more
technical commentary.

[notebook]: https://github.com/ajschumacher/ajschumacher.github.io/blob/master/20201226-estimate_manifold_dimensionality_with_lid/lid.ipynb


### <a name="derivation" href="#derivation">Mathematical derivation of LID</a>

Local Intrinsic Dimensionality arises from considering radius from a
given point to another nearer than \\( r_{\text{bound}} \\) as a
random variable \\( R \\) which takes a specific value \\( r \\).


#### <a name="cdf" href="#cdf">Cumulative Distribution Function (CDF) of radius</a>

With uniform density, the probability of encountering a point is
proportional to volume, and the volume of a radius \\( r \\) ball in
\\( D \\) dimensions is proportional to \\( r^D \\), giving the
[CDF][].

[CDF]: https://en.wikipedia.org/wiki/Cumulative_distribution_function

\\[ P(R<r) = \frac{r^D}{r_{\text{bound}}^D} = \left(\frac{r}{r_{\text{bound}}}\right)^D \\]


#### <a name="pdf" href="#pdf">Probability Density Function (PDF) of radius</a>

The [PDF][] is the derivative of the CDF with respect to \\( r \\).

\\[ P(R=r) = D \left( \frac{r}{r_{\text{bound}}} \right)^{D-1} \\]

[PDF]: https://en.wikipedia.org/wiki/Probability_density_function


#### <a name="ev" href="#ev">Expected Value of radius</a>

Integrating the PDF times \\( r \\) from 0 to \\( r_{\text{bound}} \\)
gives the [expected value][] of \\( R \\), which is \\( \frac{D}{D+1}
r_{\text{bound}} \\). This isn't terribly important to the derivation
here, but it shows that as dimensionality increases, points are likely
to be closer and closer to the outer radius. This is an aspect of the
[curse of dimensionality][] and the phenomenon that LID is based on.

[expected value]: https://en.wikipedia.org/wiki/Expected_value
[curse of dimensionality]: https://en.wikipedia.org/wiki/Curse_of_dimensionality


#### <a name="mle" href="#mle">Maximum Likelihood Estimate of dimension</a>

For a given measured \\( r \\) within \\( r_{\text{bound}} \\), some
dimensionality \\( D \\) maximizes the likelihood of that observation.
The probability density function is a likelihood, and the log of that
function has the same maximum where both derivatives are zero. Setting
the derivative with respect to \\( D \\) of the natural log likelihood
equal to zero gives a simple solution.

\\[ \log{\left( \frac{r}{r_{\text{bound}}} \right)} + \frac{1}{D} = 0 \\]

\\[ D = \frac{1}{\log{ \left( \frac{r_{\text{bound}}}{r} \right)}} \\]


#### <a name="harmonic" href="#harmonic">Harmonic mean for dimensionality</a>

With two observed radii \\( r_1 \\) and \\( r_2 \\), the joint
probability is two (PDF) likelihoods multiplied together, and the log
likelihood sums. Maximizing gives the [harmonic mean][] of two
individual estimates.

\\[ \log{\left( \frac{r_1}{r_{\text{bound}}} \right)} + \frac{1}{D} + \log{\left( \frac{r_2}{r_{\text{bound}}} \right)} + \frac{1}{D} = 0 \\]

\\[ D = \frac{2}{\log{\left( \frac{r_{\text{bound}}}{r_1} \right)} + \log{\left( \frac{r_{\text{bound}}}{r_2} \right)}} \\]

The same thing happens for any number of measurements; the harmonic
mean is the appropriate way to average estimates of dimensionality.

The harmonic mean is typically appropriate for averaging _rates_, so
its appearance here suggests thinking of _dimension_ as a _rate_.
Dimension is the rate at which space that becomes available, per
distance traveled.


### <a name="literature" href="#literature">Comparison to selected literature</a>

Reasoning about dimensionality isn't always easy. I'm grateful for two
papers in particular that helped me to think about Local Intrinsic
Dimensionality.


#### <a name="subspaces" href="#subspaces">Characterizing Adversarial Subspaces</a>

I first encountered LID in [Ma et al.][], where they use it to study
adversarial examples for deep neural networks. Their Equation 4
defines the \\( \widehat{LID} \\) estimator that they use.

[Ma et al.]: https://arxiv.org/abs/1801.02613

\\[ \widehat{LID}(x) = -\left( \frac{1}{k} \sum_{i=1}^k{ \log{ \frac{r_i(x)}{r_k(x)} } } \right)^{-1} \\]

The notation is slightly different, but this is the same estimate of
\\( D \\) as given above, except that it includes a \\( \log{(1)} \\)
term in the sum (when \\( i = k \\)). As an individual estimate, such
a term wouldn't be useful because it leads to division by zero (or an
estimate of infinite dimensionality) and couldn't be properly averaged
by harmonic mean. Especially for low \\( k \\), including that zero
term inflates the estimate of dimensionality, but this isn't a
significant issue for Ma et al. because they use the same estimator
consistently and are concerned with comparisons between rather than
magnitudes of \\( D \\).

To estimate dimensionality, nearest neighbors should be gathered
starting from points belonging to the dataset, or at least "within the
cloud" of the dataset. Ma et al. use their estimator to compare points
that belong to a dataset with points that don't necessarily belong to
that dataset. In this way, LID can be used as a metric for outlier
detection.


#### <a name="minimal" href="#minimal">Minimal Neighborhood Information</a>

It's possible to use the [CDF](#cdf) to find quantiles. For example,
the \\( r \\) that gives \\( P(R<r)=0.5 \\) is the median of the
distribution. Further, if the median \\( r \\) is \\( r_{1/2} \\),
then dimensionality is:

\\[ D = \frac{\log{2}}{\log{ \frac{r_{\text{bound}}}{r_{1/2}} }} \\]

More generally, if the \\( \frac{n}{N+1} \\) quantile \\( r \\) is
\\( r_n \\), then the following gives dimensionality:

\\[ D = \frac{ \log{ \frac{N+1}{n} } }{ \log{ \frac{r_{\text{bound}}}{r_n} } } \\]

So if you have a set of \\( N \\) points evenly spaced (in
probability) within an \\( r_{\text{bound}} \\), the \\( n \\)th point
would be the \\( \frac{n}{N+1} \\) quantile, each ratio above would
give the correct value for \\( D \\), and if you plotted the numerator
against the denominator for all the points, the result would be a
straight line with slope \\( D \\).

[Facco et al.][] use this technique. After substitutions and adjusting
for an off-by-one issue, their Equation 7 is identical to the above.
Facco et al. note that they find considerable outliers in their data
that have to be removed before they can apply their technique of
estimating \\( D \\) by regression of the line described.

[Facco et al.]: https://www.nature.com/articles/s41598-017-11873-y.pdf

For large \\( N \\), the technique of Facco et al. is close to the
maximum likelihood estimator. It helps that the average of \\( \log{
\left( \frac{N+1}{n} \right) } \\) for \\( n \\) from 1 to \\( N \\)
is close to 1. I suspect that using the maximum likelihood estimator
(with harmonic mean) is preferable, and note also that the harmonic
mean is itself [a kind of robust regression][].

[a kind of robust regression]: https://stats.stackexchange.com/questions/264368/harmonic-mean-minimizes-sum-of-squared-relative-errors


### <a name="topological" href="#topological">Topological extensions of LID</a>

I understand topological data approaches as being basically about
turning point-like data into graph-like data, usually by specifying
edges based on nearest neighbors. Then you might, as in the
[Isomap paper][], require geodesic travel via near neighbors
(connected in the graph) in order to say on the manifold.

did that in
2000, [UMAP][] did that in 2018.

[UMAP]: https://umap-learn.readthedocs.io/en/latest/

[Stephen Wolfram][] has some [topological ideas about physics][],
including a very literal [interpretation of dimensionality][] being
the rate at which traveling a distance gives you access to more space.

[Stephen Wolfram]: https://en.wikipedia.org/wiki/Stephen_Wolfram
[topological ideas about physics]: https://writings.stephenwolfram.com/2020/04/finally-we-may-have-a-path-to-the-fundamental-theory-of-physics-and-its-beautiful/
[interpretation of dimensionality]: https://www.wolframphysics.org/technical-introduction/limiting-behavior-and-emergent-geometry/the-notion-of-dimension/
