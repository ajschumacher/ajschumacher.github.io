# Use counts, not percentages

<div>
<p>Consider this data:<br>
<br>
</p>
<pre>
total    part   percent
  765      47        6%
</pre>
<br>
<br>
Clearly, there is some redundancy. Both <code>part</code> and <code>percent</code> express the same thing.<br>
<br>
With infinite precision, you could use either <code>part</code> or <code>percent</code> at your pleasure. However, in the common case where the counts (<code>total</code> and <code>part</code>) are integers and the percentage(s) are not, computers will store the integers generally much more nicely and compactly than nasty decimal things (floats or string representations).<br>
<br>
Percentages also commonly get rounded off, in which case information is lost. In the above example, 6% of 765 could be anything from 43 to 49, and possibly even more depending on what precision is used for the calculation.<br>
<br>
The moral of the story is that for data, you should always use counts, not percentages.<br>
</div>


*This post was originally hosted elsewhere.*
