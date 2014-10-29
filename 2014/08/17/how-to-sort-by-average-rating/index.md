# How To Sort By Average Rating

<div>
<p>Evan Miller's well-known <a href="http://www.evanmiller.org/how-not-to-sort-by-average-rating.html">How Not To Sort By Average Rating</a>&#160;points out problems with ranking by "wrong solution #1" (by&#160;differences, upvotes minus downvotes) and&#160;"wrong solution #2" (by average ratings, upvotes divided by total votes). Miller's "correct solution" is to use the lower bound of a <a href="http://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval#Wilson_score_interval">Wilson score</a> confidence interval for a Bernoulli parameter. I think it would probably be better to use <a href="http://en.wikipedia.org/wiki/Additive_smoothing">Laplace smoothing</a>, because:<br>
</p>
<ul>
<br>
	<li>Laplace smoothing is much easier</li>
<br>
	<li>Laplace smoothing is not always&#160;negatively biased</li>
<br>
</ul>
<br>
This is the Wilson scoring formula given&#160;in Miller's post, which we'll use to get 95% confidence interval lower bounds:<br>
<br>
<a href="rating-equation.png"><img class="aligncenter size-full wp-image-918" src="rating-equation.png" alt="rating equation"></a><br>
<blockquote>(Use minus where it says plus/minus to calculate the lower bound.) Here <em>p&#770;</em> is the <em>observed</em> fraction of positive ratings, <em>z</em><sub>&#945;/2</sub> is the (1-&#945;/2) quantile of the standard normal distribution, and <em>n</em> is the total number of ratings.</blockquote>
<br>
Now here's the formula for doing <a href="http://mathbabe.org/2012/09/20/columbia-data-science-course-week-3-naive-bayes-laplace-smoothing-and-scraping-data-off-the-web/">Laplace smoothing</a> instead:<br>
<p>(upvotes + $latex \alpha$) / (total votes + $latex \beta$)</p>
<br>
Here $latex \alpha$ and $latex \beta$ are parameters that represent our estimation of what rating is probably appropriate if we know nothing else (cf. Bayesian prior). For example, $latex \alpha = 1$ and $latex \beta = 2$ means that a post with no votes gets treated as a 0.5.<br>
<br>
The Laplace smoothing method is much simpler to calculate - there's no need for statistical libraries, or even square roots!<br>
<br>
Does it successfully solve the problems of "wrong solution #1" and "wrong solution #2"? First, the problem with "wrong solution #1", which we might summarize as "the problem with large sample sizes":<br>
<table>
<br>
<tbody>
<br>
<tr>
<br>
<td></td>
<br>
<td>upvotes</td>
<br>
<td>downvotes</td>
<br>
<td>wrong #1</td>
<br>
<td>wrong #2</td>
<br>
<td>Wilson</td>
<br>
<td>Laplace</td>
<br>
</tr>
<br>
<tr>
<br>
<td>first item</td>
<br>
<td>209</td>
<br>
<td>50</td>
<br>
<td>159</td>
<br>
<td>0.81</td>
<br>
<td>0.7545</td>
<br>
<td>0.80</td>
<br>
</tr>
<br>
<tr>
<br>
<td>second item</td>
<br>
<td>118</td>
<br>
<td>25</td>
<br>
<td>93</td>
<br>
<td>0.83</td>
<br>
<td>0.7546</td>
<br>
<td>0.82</td>
<br>
</tr>
<br>
</tbody>
<br>
</table>
<br>
All the methods&#160;agree except for "wrong solution #1" that the second item should rank higher.<br>
<br>
Then there's the problem with "wrong solution #2", which we might summarize as "the problem with small sample sizes":<br>
<table>
<br>
<tbody>
<br>
<tr>
<br>
<td></td>
<br>
<td>upvotes</td>
<br>
<td>downvotes</td>
<br>
<td>wrong #1</td>
<br>
<td>wrong #2</td>
<br>
<td>Wilson</td>
<br>
<td>Laplace</td>
<br>
</tr>
<br>
<tr>
<br>
<td>first item</td>
<br>
<td>1</td>
<br>
<td>0</td>
<br>
<td>1</td>
<br>
<td>1.0</td>
<br>
<td>0.21</td>
<br>
<td>0.67</td>
<br>
</tr>
<br>
<tr>
<br>
<td>second item</td>
<br>
<td>534</td>
<br>
<td>46</td>
<br>
<td>488</td>
<br>
<td>0.92</td>
<br>
<td>0.90</td>
<br>
<td>0.92</td>
<br>
</tr>
<br>
</tbody>
<br>
</table>
<br>
All the methods agree except for "wrong solution #2" that the second item should rank higher.<br>
<br>
How similar are the results for the Wilson method and&#160;the Laplace method overall? Take a look: here color encodes the score, with blue at 0.0, white at 0.5, and red at 1.0:<br>
<br>
<a href="plot1.png"><img class="aligncenter size-large wp-image-938" src="plot1.png" alt="plot of Wilson and Laplace methods"></a><br>
<br>
They're so similar, you might say, that you would need a very good reason to justify the complexity of the calculation for the Wilson bound. But also, the differences favor the Laplace method! The Wilson method, because it's a lower bound, is negatively biased everywhere. It's certainly not symmetrical. Let's zoom in:<br>
<br>
<a href="plot2.png"><img class="aligncenter size-large wp-image-939" src="plot2.png" alt="plot of Wilson and Laplace methods - zoomed"></a><br>
<br>
With the Wilson method, you could have three upvotes, no downvotes and still rank lower than an item that is disliked by 50% of people over the long run. That seems strange.<br>
<br>
The Laplace method does have its own biases. By choosing $latex \alpha=1$ and $latex \beta=2$, the bias is toward 0.5, which I think is reasonable for a ranking problem like this. But you could change it: $latex \alpha=0$ with&#160;$latex \beta=1$ biases toward zero,&#160;$latex \alpha=1$ with&#160;$latex \beta=0$ biases toward one. And&#160;$latex \alpha=100$ with $latex \beta=200$ biases toward 0.5 very strongly. With the Wilson method you can tune the size of the interval, adjusting the confidence level, but this only adjusts how strongly you're biased toward zero.<br>
<br>
Here's another way of looking at the comparison. How do the two methods compare for varying numbers of upvotes with a constant number (10) of downvotes?<br>
<br>
<a href="plot3.png"><img class="aligncenter wp-image-942 size-large" src="plot3.png" alt="Wilson and Laplace methods again"></a><br>
<br>
Those are similar curves. Not identical - but is there a difference to justify the complexity of the Wilson score?<br>
<br>
In conclusion: Just adding a little bit to your&#160;numerators and denominators (Laplace smoothing) gives you a scoring system that is as good or better than calculating Wilson scores.<br>
<br>
[<a href="https://gist.github.com/ajschumacher/b9645724d9d842810613">code for this post</a>]<br>
</div>


*This post was originally hosted elsewhere.*