# Perplexity: what it is, and what yours is

<div>
<p>[<a href="http://ajschumacher.github.io/perplexity/">Test <em>your</em> perplexity!</a>]<br>
<br>
Perplexity is an interesting measure of how well you're predicting something. It has a nice <a href="http://en.wikipedia.org/wiki/Perplexity">mathy definition</a>;&#160;I'll try to describe it quite simply here.<br>
<br>
Say the real thing you want to predict is the sequence of numbers from one to six. If you predict each number in turn with a six-sided die, you will be right about one sixth of the time. The die's perplexity with this data (and really with any data it could possibly predict - dice are <a href="http://en.wikipedia.org/wiki/Cleromancy">dumb</a>) is six.<br>
<br>
The perplexity of whatever you're evaluating, on the data you're evaluating it on, sort of tells you "this thing is right about as often as an x-sided die would be."<br>
<br>
Note that a human, after seeing that the first number is 1 and the second is 2, might guess that the third is 3, and so on. So a human is a better predictor than a die, and would have a lower perplexity. So would a linear model trained on the data seen so far, in this case. That is, whatever you're evaluating (a model, or whatever) is allowed to see the data so far before it predicts what the next thing is, and that is frequently helpful.<br>
<br>
This is interesting and easily calculable for predicting categorical things like letters, or words. Maybe you're a computational linguist and you want to measure how well your model can predict the next English word in a book. Humans are pretty good at this, by the way. ("The early bird gets the ___?") Computers can achieve a perplexity of 247, <a href="http://en.wikipedia.org/wiki/Perplexity">apparently</a> - like having a 247-sided die predict each subsequent word. (The computer "makes a new die" for each prediction, based on the words so far.)<br>
<br>
You can also predict one letter at a time, and you'll get a much better perplexity score, even just since there are many fewer different letters than different words. This has been done, even, as described in this interesting <a href="http://nautil.us/issue/4/the-unlikely/the-man-who-invented-modern-probability">article</a> about Andrei Kolmogorov:<br>
</p>
<blockquote>To measure the artistic merit of texts, Kolmogorov also employed a letter-guessing method to evaluate the entropy of natural language. ... His group conducted a series of experiments, showing volunteers a fragment of Russian prose or poetry and asking them to guess the next letter, then the next, and so on.</blockquote>
<br>
I know you're itching to participate in such an experiment - and you can! On <a href="http://ajschumacher.github.io/perplexity/">the linked page</a> you'll be able to try your hand. It's interesting to consider whether you're evaluating the artistic merit of the text, or your own knowledge of English, or some combination, or what.<br>
<br>
Computers can predict letters <a href="http://acl.ldc.upenn.edu/J/J92/J92-1002.pdf">pretty well</a>&#160;- a perplexity of about 3.4. And that's predicting from the range of all printable characters (well, ASCII characters). This <a href="http://ajschumacher.github.io/perplexity/">human test</a> only asks you to predict from a range of about 30 characters, which is a bit easier. So I hope you can beat 3.4!<br>
<br>
[<a href="http://ajschumacher.github.io/perplexity/">Test&#160;<em>your</em>&#160;perplexity!</a>]<br>
<br>
Thanks to David for originally leading me to think about perplexity!<br>
</div>


*This post was originally hosted elsewhere.*