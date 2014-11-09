# The shortest introduction to R



<a href="http://www.r-project.org/">R</a> is a curly brace language. It uses "<code>&lt;-</code>" for assignment. Dots are allowed in names and don't indicate structure. Arguments are both positional and named and can be defaulted.

```
subtract &lt;- function(first.arg, second.arg = 3) {
  return(first.arg - second.arg)
}
```

Now <code>subtract(5, 1)</code> returns <code>4</code>, as does <code>subtract(second.arg=1, first.arg=5)</code>, and <code>subtract(5)</code> returns <code>2</code>.

This prints the numbers 1 to 10, inclusive:

```
for (i in 1:10) {
  print(i)
}
```

Data lives in <em>vectors</em> - lists of values of the same type. The types are <em>logical</em> (<code>TRUE</code> or <code>FALSE</code>), <em>numeric</em>, and <em>character</em> (string). Vectors are put together with the function <code>c()</code>, which coerces and collapses things, so these two character vectors are the same:

```
c(1, 2, "three", 4, 5)
c(1, c(2, "three", c(4, 5)))
```

Just about everything in R happens element-wise on vectors. Shorter vectors are <em>recycled</em> (repeated) to provide enough elements when needed. So <code>subtract(c(10, 100))</code> will return <code>c(7, 97)</code>.

The heavily used <em>data frame</em> is essentially a list of vectors.

```
x &lt;- data.frame(col.one=c(1, 1, 2, 3, 5), col.two=6:10)
x
```

<pre>
  col.one col.two
1       1       6
2       1       7
3       2       8
4       3       9
5       5      10</pre>
You can get the first row of <code>x</code> with <code>x[1, ]</code>. You can get the second column of <code>x</code> with <code>x[, 2]</code>, <code>x[[2]]</code> or <code>x$col.two</code>.

You can select elements from vectors with logicals or index numbers. These both return <code>c(9, 10)</code>:

```
x$col.two[x$col.two &gt; 8]
x$col.two[c(4, 5)]
```

You can get help with <code>help()</code> or the shortcut, <code>?</code>. For example, <code>?read.csv</code> or <code>help(plot)</code>. There's also search functionality, but I recommend using the internet instead.

&#160;

This introduction is designed to maximize utility over length, and does so by leaving some things out. I recommend John Cook's online&#160;<a href="http://www.johndcook.com/R_language_for_programmers.html">R programming for those coming from other languages</a>&#160;for a slightly expanded view, and Norman Matloff's book&#160;<a href="http://www.amazon.com/The-Art-Programming-Statistical-Software/dp/1593273843">The Art of R Programming</a> for a proper introduction with examples and applications.



*This post was originally hosted [elsewhere](https://planspacedotorg.wordpress.com/2014/01/01/the-shortest-introduction-to-r-2/).*
