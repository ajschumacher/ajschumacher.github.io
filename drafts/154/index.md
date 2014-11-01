# Sum of Squares: from Definitional to Computational Formula



In introductory statistics the Sum of Squares $latex SS$, implicitly the sum of the squared deviations from the mean, is taught early on along with variance and standard deviation. Often a "definitional" and "computational" formula are introduced in rapid succession. Especially for folks who aren't terribly comfortable with math notation, this can be confusing. I will explain what's going on.

Here is how you get the Sum of Squares $latex SS$.

You start with a bunch of numbers. Call them $latex X_1, X_2, ..., X_N$. So you have $latex N$ numbers.

You get the mean of these numbers, which we'll call $latex \overline{X}$ (read as "x-bar"). First add up all the numbers. That's $latex \sum\limits_{i=1}^{N} X_i$. This is sometimes written as just $latex \sum X$ but for later clarity let's keep the limits. Then you divide that sum by $latex N$ to get the average, also known as arithmetic mean, $latex \overline{X}$. We'll use this equation later.

$latex \overline{X}=\frac{\sum\limits_{i=1}^{N} X_i}{N}$

Now that we have the mean, we can go through all our numbers again. For each one, we subtract the mean to get the deviation $latex X_i - \overline{X}$. Deviations may be positive or negative. We square each one that we get, and we add these all up. This is the Sum of Squares $latex SS$. This is the <em>definition</em> of the Sum of Squares. So it's called the Definitional Formula.

$latex SS=\sum\limits_{i=1}^{N} \left(X_i-\overline{X}\right)^2$

So far everything is very sensible. But then you hear about the Computational Formula for the Sum of Squares.

$latex SS=\sum\limits_{i=1}^{N} X_i^2-\frac{\left(\sum\limits_{i=1}^{N} X_i\right)^2}{N}$

If you're like me, it isn't immediately clear that these two are equal. The computational formula doesn't even have the mean in it!

http://www.une.edu.au/WebStat/unit_materials/c4_descriptive_statistics/sums_of_squares.htm

http://www.une.edu.au/WebStat/unit_materials/c4_descriptive_statistics/sums_of_squares.htm

http://www.psych.utoronto.ca/courses/c1/chap11/chap11.html



*This post was originally hosted elsewhere.*
