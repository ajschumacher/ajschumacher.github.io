# Visualize co-occurrence graph from document occurrence input using R package 'igraph'



<a href="http://en.wikipedia.org/wiki/Co-occurrence">Co-occurrence</a> can mean two words occurring together in the same document. In this case there are likely to be very many words total, and the following visualization will not necessarily be sensible without judicious data trimming. However there are other cases, for example perhaps the occurrence of two full texts in the same manuscript produced by a scribe in the middle ages, in which the universe of items is reasonably small. In any case where the universe of co-occurring items is fairly small, the following visualization technique might be useful.

For the running example, consider a corpus of three sentences composed of words:

<pre>the fat

the cat

the fat fat cat</pre>

One step of pre-processing is required: make a table with one column for every element that appears in any collection in the corpus and one row for every collection in the corpus. (It might be done&#160;programmatically&#160;in some cases, but this will remain outside the current scope.) The values of the table are counts of how many times each element appears in each collection. In some cases this can be a reasonable format even for human-entered data. Load the data into a data frame in R. You probably want to store your data in a separate file, but for convenience we can continue the example:

<pre>data &lt;- read.table(header=T, row.names=1, text=

"    the fat cat

 one   1   1   0

 two   1   0   1

 three 1   2   1")</pre>

Later we will want to use the number of times each word occurs, so get that now, and prepare to start doing matrix things:

<pre>total_occurrences &lt;- colSums(data)

data_matrix &lt;- as.matrix(data)</pre>

We want a co-occurrence matrix, which has rows and columns both representing the words (elements) that occur, and the values in the matrix representing the number of times that the elements occur together in the same collection. This is easy to calculate thanks to the nature of <a href="http://en.wikipedia.org/wiki/Matrix_multiplication#Matrix_product_.28two_matrices.29">matrix multiplication</a>. (You may want to alter the <code>data_matrix</code> by making all entries zero or one, which is easily done with <code>data_matrix &lt;- pmin(data_matrix, 1)</code>, because multiple occurrences of the same elements in the same collection lead to multiplicative results; "the the the cat cat" counts as six co-occurrences of "the" with "cat".)

<pre>co_occurrence &lt;- t(data_matrix) %*% data_matrix</pre>

If you don't have <code>igraph</code> installed, install it. It's as easy as <code>install.packages("igraph")</code>. We'll load it and build our graph object.

<pre>library(igraph)

graph &lt;- graph.adjacency(co_occurrence,

                         weighted=TRUE,

                         mode="undirected",

                         diag=FALSE)</pre>

That's the extent of the setup! You can start looking around immediately with commands as simple as <code>plot(graph)</code>, but you probably want to change some of the display parameters to make the size and color of the visual elements more meaningful, or at least customized. For example, after <code>set.seed(3)</code> for reproducibility:

<pre>plot(graph,

     vertex.label=names(data),

     vertex.size=total_occurrences*18,

     edge.width=E(graph)$weight*8)</pre>

<a href="screen-shot-2013-01-29-at-8-30-02-pm.png"><img class="alignnone size-medium wp-image-21" alt="graph" src="screen-shot-2013-01-29-at-8-30-02-pm.png"></a>

You'll have to experiment with tweaking the option values. You can use mathematical transforms other than just multiplication as well, of course. Other options you may want to add include <code>vertex.color</code>, <code>edge.color</code>, and <code>layout</code>. See R's help for <code>igraph.plotting</code>, but also be sure to play with <code>tkplot</code> in place of <code>plot</code>, which gives you an interactive environment to change things in. It's a good place to try different layouts and just move things around in to explore.

<a href="screen-shot-2013-01-29-at-8-43-21-pm.png"><img class="alignnone size-medium wp-image-23" alt="graph" src="screen-shot-2013-01-29-at-8-43-21-pm.png"></a>

For much more, you can always check out the <a href="http://igraph.sourceforge.net/">igraph web site</a>. Their <a href="http://igraph.sourceforge.net/screenshots.html">screenshots</a> will quickly give you an overview of what else is possible.



*This post was originally hosted elsewhere.*
