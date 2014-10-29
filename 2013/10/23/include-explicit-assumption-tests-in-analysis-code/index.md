# Include explicit assumption tests in analysis code



Especially if you're doing analysis of any importance and especially if the analysis, once created, will be run again and again on new or otherwise updated data, you should write tests in the analysis code.

In software engineering (see Martin's <a href="http://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882">Clean Code</a>, among many possible references) there is the now-prevalent idea of testing: unit tests, Test-Driven Development (<a href="http://en.wikipedia.org/wiki/Test-driven_development">TDD</a>), and so on. Some statistical languages (by which I mean R, and I'd be interested to hear of others) have unit test frameworks. R has <a href="http://cran.r-project.org/web/packages/RUnit/index.html">RUnit</a> and <a href="http://cran.r-project.org/web/packages/testthat/index.html">testthat</a> (see <a href="http://www.johnmyleswhite.com/notebook/2010/08/17/unit-testing-in-r-the-bare-minimum/">White's post</a> and this <a href="http://www.bioconductor.org/developers/unitTesting-guidelines/">bioconductor one</a>). Tests help you by making components of functionality more explicit and by&#160;giving you more confidence that your software is functional even when you make changes later with consequences that you might not notice otherwise.

The testing in software development is mostly about confirming behaviors automatically that a human could check by hand: "My function for adding returns 5 when I ask it to add 3 and 2," for instance. In analysis, the correct answer depends on data, and is not likely to be known, so the real risk of incorrect results comes from mistakes not in the machinery for calculating (usually) but in unexpected or unaccounted-for conditions that appear in the data being analyzed. Like software unit testing, there is some art in determining exactly which tests you should write, and the benefit of enhanced quality and confidence in that quality is also similar, but the kinds of tests are much more about making explicit your assumptions about your input data.

The best-case scenario in the case of an incorrect assumption in your analysis is that your code breaks nicely. (For instance, you reference a column of data by name which doesn't exist for a new input file and execution of your analysis stops there with an error message.) It is much worse for code to proceed regardless, not alerting you to a hidden problem, and yielding results that are not correct. (For instance, a new classification is added some categorical variable which your analysis gleefully ignores, now ignoring 30% of cases.)

In some things R has this behavior built in. If you try to take the <code>mean()</code> of a vector with any missing values at all, the result will be <code>NA</code>. This forces you (or should, if you don't just instinctually put in <code>na.rm=T</code>) to think about <em>why</em> there are missing values and how the missing values affect your analysis.

As you develop analysis code, you should be checking many things as you go along anyway. Writing your checks into the analysis code makes them more explicit, makes them visible to others who view your code, and importantly makes them repeatable when you change your code and when the input data changes.

You could use a full unit testing framework, but in R you can also get a lot of mileage out of the built-in&#160;<code>stopifnot()</code>. You pass as an argument something you think should be true. Often the combination with <code>all()</code> is particularly useful.

Here are a couple examples of things you might test and how you could test them in R:

1. Test that a data frame's column names are exactly what you think they are. This is especially important if you ever use column numbers to refer to data rather than the column names - and in general, you want to know about it if the data you're analyzing changes format at all; even if it's just the ordering of columns, it could accompany other changes that merit manual investigation.

```

# check that the data has these three column names

stopifnot(names(aDataFrame) == c("expectedColumn", "expectedColumn2", "expectedColumn3"))

```

2. Test that a column (or columns) you think provide a unique identifier are actually all unique. This is&#160;<span>often&#160;</span><span>important when merging, and there are more checks you might use around merges to ensure what you get out matches what you're expecting.</span>

```

# check that a vector has all unique values

stopifnot(all(!duplicated(aVector)))

# check that some columns have all unique rows

stopifnot(all(!duplicated(aDataFrame[,c("aColumnName", "anotherColumnName")])))

```

3. Often you'll assume that only certain values occur, which can lead to problems if you're wrong, or if you become wrong at some point in the future. Make your assumption explicit!

```

# check that all values in a vector are one of three we're expecting

stopifnot(all(aVector %in% c("possibleVal1", "possibleVal2", "possibleVal3")))

```

4. There are occasions when you'll want to be sure that exactly one of several columns is set. (This check uses the fact that in R <code>TRUE</code> evaluates to <code>1</code> when adding.)

```

# check that exactly one of three values is true everywhere

stopifnot(all(vectorOne + vectorTwo + vectorThree == 1))

```

Writing tests like these makes you articulate your assumptions more completely than you might otherwise, and the exercise of doing it can lead you to discover things you might otherwise have overlooked as well. If you think it couldn't possibly be worth checking something because it is so certain to be true, a substantial fraction of the time you'll find the most interesting surprises in your data when you do the check anyway. And when you re-run your analysis a month later and find that the new data doesn't behave like the old data, you'll be glad to find out right away and be able to update your analysis, rather than possibly relying on or even sharing results you don't yet know are faulty.

A final note: People often say that they assume such-and-such is normally distributed, for regression and so on, and you might wonder how to check this. There are tests, such as the <a href="http://en.wikipedia.org/wiki/Shapiro%E2%80%93Wilk_test">Shapiro-Wilk test</a> (<code>shapiro.test()</code> in R) but in practice I have never seen real data that Shapiro-Wilk would let you call normal. You're far better off disabusing yourself of the notion that anything is really normally distributed and either doing parametric work with this understanding or staying more descriptive and/or nonparametric. See also&#160;<a href="http://www.johndcook.com/blog/2010/08/11/what-distribution-does-my-data-have/">Cook's excellent exposition on distributions</a>.



*This post was originally hosted elsewhere.*
