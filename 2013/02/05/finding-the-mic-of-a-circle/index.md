# Finding the MIC of a circle

<div>
<p>Maximal Information Coefficient is a measure of two-variable dependence with some interesting properties. Full information and&#160;<a href="http://www.exploredata.net/Usage-instructions">details</a>&#160;on how to calculate MIC using R are available at&#160;<a href="http://www.exploredata.net/">exploredata.net</a>. Here I calculate the MIC for an&#160;<a href="http://andrewgelman.com/2013/02/what-principles-should-govern-attempts-to-summarize-bivariate-associations-in-large-multivariate-datasets/">example</a>&#160;(originally&#160;<a href="http://andrewgelman.com/2011/12/mr-pearson-meet-mr-mandelbrot-detecting-novel-associations-in-large-data-sets/">here</a>) that Andrew Gelman posed on his&#160;<a href="http://andrewgelman.com/">blog</a>.<br>
<br>
This is Gelman's proposed test data, with seed set to 42 for replicability.<br>
</p>
<pre><code>set.seed(42)
n &lt;- 1000
theta &lt;- runif(n, 0, 2 * pi)
x &lt;- cos(theta)
y &lt;- sin(theta)
plot(x, y)
</code></pre>
<br>
<a href="download.png"><img class="alignnone size-medium wp-image-134" alt="plot of circle" src="download.png"></a><br>
<br>
Sure enough this looks like a circle, which is clearly a relationship between&#160;<code>x</code>&#160;and&#160;<code>y</code>, but a standard correlation coefficient will not indicate this.<br>
<pre><code>cor(x, y)
</code>
<code>## [1] -0.008817
</code></pre>
<br>
The interface to work with MINE is a little clumsy, but this will do it. (Be sure to have the R package&#160;<code>rJava</code>&#160;installed.)<br>
<pre><code>df &lt;- data.frame(x, y)
write.csv(df, "data.csv", row.names = FALSE)
source("MINE.r")
MINE("data.csv", "all.pairs")
</code>
<code>## *********************************************************
## MINE version 1.0.1d
## Copyright 2011 by David Reshef and Yakir Reshef.
## 
## This application is licensed under a Creative Commons
## Attribution-NonCommercial-NoDerivs 3.0 Unported License.
## See
## http://creativecommons.org/licenses/by-nc-nd/3.0/ for
## more information.
## *********************************************************
## 
## 
## input file = data.csv
## analysis style = allpairs
## results file name = 'data.csv,allpairs,cv=0.0,B=n^0.6,Results.csv'
## print status frequency = every 100 variable pairs
## status file name = 'data.csv,allpairs,cv=0.0,B=n^0.6,Status.txt'
## alpha = 0.6
## numClumpsFactor = 15.0
## debug level = 0
## required common values fraction = 0.0
## garbage collection forced every 2147483647 variable pairs
## reading in dataset...
## done.
## Analyzing...
## 1 calculating: "y" vs "x"...
## 1 variable pairs analyzed.
## Sorting results in descending order...
## done. printing results
## Analysis finished. See file "data.csv,allpairs,cv=0.0,B=n^0.6,Results.csv" for output
</code>
<code>results &lt;- read.csv("data.csv,allpairs,cv=0.0,B=n^0.6,Results.csv")
t(results)
</code>
<code>##                        [,1]       
## X.var                  "y"        
## Y.var                  "x"        
## MIC..strength.         "0.6545"   
## MIC.p.2..nonlinearity. "0.6544"   
## MAS..non.monotonicity. "0.04643"  
## MEV..functionality.    "0.3449"   
## MCN..complexity.       "5.977"    
## Linear.regression..p.  "-0.008817"
</code></pre>
<br>
The result is that the MIC for this case is 0.6545, and the relation is highly non-linear. It isn't clear that 0.65 is the 'right' answer for a circle, but it does provide more indication of a relationship than a correlation coefficient of zero does.<br>
<br>
[This <a href="http://rpubs.com/ajschumacher/MICofCircle">post</a> also on <a href="http://rpubs.com/">rPubs</a>.]<br>
</div>


*This post was originally hosted elsewhere.*
