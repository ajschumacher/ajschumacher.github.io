# How To Sort By Average Rating



Evan Miller's well-known <a href="http://www.evanmiller.org/how-not-to-sort-by-average-rating.html">How Not To Sort By Average Rating</a> points out problems with ranking by "wrong solution #1" (by differences, upvotes minus downvotes) and "wrong solution #2" (by average ratings, upvotes divided by total votes). Miller's "correct solution" is to use the lower bound of a <a href="http://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval#Wilson_score_interval">Wilson score</a> confidence interval for a Bernoulli parameter. I think it would probably be better to use <a href="http://en.wikipedia.org/wiki/Additive_smoothing">Laplace smoothing</a>, because:

 * Laplace smoothing is much easier
 * Laplace smoothing is not always negatively biased

This is the Wilson scoring formula given in Miller's post, which we'll use to get 95% confidence interval lower bounds:

<a href="rating-equation.png"><img class="aligncenter size-full wp-image-918" src="rating-equation.png" alt="rating equation"></a>

> (Use minus where it says plus/minus to calculate the lower bound.) Here \\( \hat{p} \\) is the <em>observed</em> fraction of positive ratings, <em>z</em><sub>α/2</sub> is the (1-α/2) quantile of the standard normal distribution, and <em>n</em> is the total number of ratings.

Now here's the formula for doing <a href="http://mathbabe.org/2012/09/20/columbia-data-science-course-week-3-naive-bayes-laplace-smoothing-and-scraping-data-off-the-web/">Laplace smoothing</a> instead:

\\[ \frac{\text{upvotes} + \alpha}{\text{total votes} + \beta} \\]

Here \\( \alpha \\) and \\( \beta \\) are parameters that represent our estimation of what rating is probably appropriate if we know nothing else (cf. Bayesian prior). For example, \\( \alpha = 1 \\) and \\( \beta = 2 \\) means that a post with no votes gets treated as a 0.5.

The Laplace smoothing method is much simpler to calculate - there's no need for statistical libraries, or even square roots!

Does it successfully solve the problems of "wrong solution #1" and "wrong solution #2"? First, the problem with "wrong solution #1", which we might summarize as "the problem with large sample sizes":

<table>
<tbody>
<tr>
<td></td>
<td>upvotes</td>
<td>downvotes</td>
<td>wrong #1</td>
<td>wrong #2</td>
<td>Wilson</td>
<td>Laplace</td>
</tr>
<tr>
<td>first item</td>
<td>209</td>
<td>50</td>
<td>159</td>
<td>0.81</td>
<td>0.7545</td>
<td>0.80</td>
</tr>
<tr>
<td>second item</td>
<td>118</td>
<td>25</td>
<td>93</td>
<td>0.83</td>
<td>0.7546</td>
<td>0.82</td>
</tr>
</tbody>
</table>

All the methods agree except for "wrong solution #1" that the second item should rank higher.

Then there's the problem with "wrong solution #2", which we might summarize as "the problem with small sample sizes":

<table>
<tbody>
<tr>
<td></td>
<td>upvotes</td>
<td>downvotes</td>
<td>wrong #1</td>
<td>wrong #2</td>
<td>Wilson</td>
<td>Laplace</td>
</tr>
<tr>
<td>first item</td>
<td>1</td>
<td>0</td>
<td>1</td>
<td>1.0</td>
<td>0.21</td>
<td>0.67</td>
</tr>
<tr>
<td>second item</td>
<td>534</td>
<td>46</td>
<td>488</td>
<td>0.92</td>
<td>0.90</td>
<td>0.92</td>
</tr>
</tbody>
</table>
All the methods agree except for "wrong solution #2" that the second item should rank higher.

How similar are the results for the Wilson method and the Laplace method overall? Take a look: here color encodes the score, with blue at 0.0, white at 0.5, and red at 1.0:

<a href="plot1.png"><img class="aligncenter size-large wp-image-938" src="plot1.png" alt="plot of Wilson and Laplace methods"></a>

They're so similar, you might say, that you would need a very good reason to justify the complexity of the calculation for the Wilson bound. But also, the differences favor the Laplace method! The Wilson method, because it's a lower bound, is negatively biased everywhere. It's certainly not symmetrical. Let's zoom in:

<a href="plot2.png"><img class="aligncenter size-large wp-image-939" src="plot2.png" alt="plot of Wilson and Laplace methods - zoomed"></a>

With the Wilson method, you could have three upvotes, no downvotes and still rank lower than an item that is disliked by 50% of people over the long run. That seems strange.

The Laplace method does have its own biases. By choosing \\( \alpha=1 \\) and \\( \beta=2 \\), the bias is toward 0.5, which I think is reasonable for a ranking problem like this. But you could change it: \\( \alpha=0 \\) with \\( \beta=1 \\) biases toward zero, \\( \alpha=1 \\) with \\( \beta=0 \\) biases toward one. And \\( \alpha=100 \\) with \\( \beta=200 \\) biases toward 0.5 very strongly. With the Wilson method you can tune the size of the interval, adjusting the confidence level, but this only adjusts how strongly you're biased toward zero.

Here's another way of looking at the comparison. How do the two methods compare for varying numbers of upvotes with a constant number (10) of downvotes?

<a href="plot3.png"><img class="aligncenter wp-image-942 size-large" src="plot3.png" alt="Wilson and Laplace methods again"></a>

Those are similar curves. Not identical - but is there a difference to justify the complexity of the Wilson score?

In conclusion: Just adding a little bit to your numerators and denominators (Laplace smoothing) gives you a scoring system that is as good or better than calculating Wilson scores.

[<a href="https://gist.github.com/ajschumacher/b9645724d9d842810613">code for this post</a>]



*This post was originally hosted [elsewhere](https://planspacedotorg.wordpress.com/2014/08/17/how-to-sort-by-average-rating/).*
