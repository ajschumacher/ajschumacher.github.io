# Number-line comparisons are good for code



You have a lot of flexibility in how you write comparisons with most programming languages. Typically, for example, you can use either of <code>x &lt; 5</code> and <code>5 &gt; x</code>.

I recommend the convention of writing comparisons as if they come from a <a href="http://en.wikipedia.org/wiki/Number_line">number line</a>. That is, always use "<code>&lt;</code>" and "<code>&lt;=</code>", and never use "<code>&gt;</code>" and "<code>&gt;=</code>".

This convention reduces cognitive load - it makes code easier to read and write. This is particularly true when testing ranges, and I find it &#160;to make an exceptionally large difference in the common case of testing date ranges. Compare the following two lines of pseudo-code:

<pre>date &gt; 2010-04-23 &amp; date &lt; 2010-08-11 # bad

2010-04-23 &lt; date &amp; date &lt; 2010-08-11 # good</pre>

The second line is much more readable than the first. Indeed, even less clear versions are possible. It becomes easy to introduce errors, and even not unlikely that you'll be testing for impossible ranges.

In some languages (notably Python) you can write chained comparisons like <code>3 &lt; x &lt; 5</code> and it will work as expected. In some languages you can write chained comparisons like that and it will evaluate but probably not as you intended. In JavaScript, <code>3 &lt; 4 &lt; 2</code> is <code>true</code>. (<a href="http://www.youtube.com/watch?v=CFReYwSwFbc">wat</a>) In Ruby and R, chained comparisons like these will give you an error. So I prefer the style already shown, with the variable being tested close to the "and" operator joining the two comparisons.

Many languages use "<code>=</code>" for assignment and "<code>==</code>" for testing equality, so it has been <a href="http://c2.com/cgi/wiki?CompareConstantsFromTheLeft">noted</a> that <code>5 == x</code> is safer than <code>x == 5</code> in the sense that if you mistakenly write <code>x = 5</code> then you've broken something, but <code>5 = x</code> is just an error that will get caught. I'm not terribly concerned about this. In both Python and R, the equivalent of "if x = 5" is an error.

Since R uses "<code>&lt;-</code>" for assignment, there is a similar possible problem:

<pre>x &lt; -2 # compares x to -2

x &lt;-2  # assigns -2 to x</pre>

This is indeed annoying. (Thanks <a href="https://twitter.com/Gimperion">Tommy</a> for pointing it out.) I think the advantages of writing nice number-line comparisons outweigh this risk in R, but it is the most compelling argument I've seen for not using "<code>&lt;-</code>" for assignment.



*This post was originally hosted elsewhere.*
