# Please stop saying “Big Data”


*A short talk for [AIR](http://www.air.org/).*


-----

![](alan_kay.jpg)

-----

This is [Alan Kay](http://en.wikipedia.org/wiki/Alan_Kay). He worked at Xerox PARC and he said “The best way to predict the future is to invent it.” He also said, at a [talk](https://www.youtube.com/watch?v=gTAghAJcO1o) earlier this year:

> Big data is a way that a lot of people are trying to make money today. And it's a favorite of marketing people, because it's in the wind. Everybody has heard the phrase “big data.” Not everybody knows what it means. And so it's the perfect context for doing things that people can say, “Well this is an application of big data and this is an application of big data.” But in fact, the interesting future's not about data at all - it's about meaning.

The objection here, and it's an objection of many, is an objection to torturing the phrase “Big Data” until it means everything and nothing.

If you prefer consultants to luminaries, you can read an article that Deloitte published last Wednesday on the Wall Street Journal's web site called [Should We Stop Using the Term ‘Big Data’?](http://deloitte.wsj.com/cio/2014/12/10/should-we-stop-using-the-term-big-data/).

The answer is yes, we should stop saying “big data” when we just mean “data.”


-----

![](excel.png)

-----

Some people think big data is data that they won't be able to work with effectively in Excel. The problem with that statement is that it implies that there might be some data out there that they *could* work with effectively in Excel. There are many reasons Excel is bad, but to summarize: If you care about getting the right answer, you shouldn't use Excel [1]. But it is also true that more and more, we've moved from the era of “shouldn't use Excel” to the era of “can't possibly use Excel.”

There are lots of reasons that you can't use Excel these days, and they can include volume, velocity, variety, and veracity, those words that buzz along with “big data.” So these things are trying to get people to realize that their ideas about how to work with data are inadequate. They were inadequate before as well, but now they're really clearly inadequate. But people prefer to think that the problem is only with these things that seem new.

Working with data is always about building systems. This includes systems where the output is an analysis result. You need to build systems that are testable, reusable, extensible, and composable. Ideally, systems that are elegant. You can't do that with Excel, or with most of the commercial statistical offerings. To steal some other peoples' language, [software is eating the world](http://www.wsj.com/articles/SB10001424053111903480904576512250915629460) in more ways than one, and you need to [program or be programmed](http://www.rushkoff.com/program-or-be-programmed/).

What should you learn, if all you know is Excel or something similarly unfortunate like SAS or Stata? If you think you should learn R or Clojure or Scala, you might be right. Otherwise, learn Python.

[1]: *See, for example [Growth in a Time of Debt](http://www.businessweek.com/articles/2013-04-18/faq-reinhart-rogoff-and-the-excel-error-that-changed-history).*


-----

![](big_data.png)

-----

The phrase “big data” is now free to have a useful meaning. [John Langford](http://en.wikipedia.org/wiki/John_Langford_%28computer_scientist%29)'s practical definition is the best I've seen. ([source](http://people.cs.umass.edu/~mcgregor/stocworkshop/langford.pdf)).

It's not quite the same thing as being “O(n<sup>2</sup>) algorithm feasible,” but to put it differently, let's say that some small data you could theoretically work with in Excel.

Medium data might fit on one computer, but to work with it you'll probably need someone who knows what “O(n<sup>2</sup>)” means. That person started programming years before you, and you probably want that person working on your small data too.

Very few people have big data by the definition here, and that's okay.


-----

![](unreasonable_data.png)

-----

Is more data better? This question is distinct from the question of whether our data is big. Do we want more data at all? What good is it?

In 2009, some folks at Google come out with [The Unreasonable Effectiveness of Data](http://static.googleusercontent.com/media/research.google.com/en/us/pubs/archive/35179.pdf). What did our friends at Google mean?


-----

![](scaling_corpora.png)

-----

A good illustration of their point is a [2001 Microsoft paper](http://dl.acm.org/citation.cfm?id=1073017). The graph shows that for their natural language problem it seems to matter more how much data you have than which algorithm you use. Their data is text. There are three things to say here.

First, is this big data? Their complete data set was a billion words. Around five gigabytes. Not big by our definition. Perhaps medium. But it was bigger than other people had been using then.

Second, how are we measuring effectiveness? The Y axis is prediction accuracy on a test set. The model sees some training data, and then we ask it to predict for separate test data, and we see how often it's right. This is a predictive framing of the problem, which is powerful. It's the scientific method: the model is correct to the extent it makes correct predictions. It doesn't make much sense to try to interpret these models in any other way.

Here's an analogy to consider: computational linguistics is to traditional linguistics as machine learning is to traditional statistics.

Finally, should we be surprised? Or do we understand and deserve this effectiveness of data? The problem these models are attacking is a natural language problem. All these models are trying to overcome [the poverty of the stimulus](http://en.wikipedia.org/wiki/Poverty_of_the_stimulus), and they have a lot less [language instinct](http://en.wikipedia.org/wiki/The_Language_Instinct) than you or I. So it makes sense that they should do better when they get to study more text.

So here is a case where more data is better.

Are all cases like this?

No!

What is it about this case that makes more data better?

These models are *high variance*, meaning roughly that they have a ton of coefficients [2]. Around one per word of English, at least, in this case. Which is not so different from having relatively *small* data for the rarer words. And this is a common pattern, in which you have small data for a big number of things.

This particular case is also a little special in that it was very easy to add more data. They're just grabbing text from the internet.

[2]: *[Xavier Amatriain](http://xavier.amatriain.net/) (formerly of Netflix) has a good [explanation](http://technocalifornia.blogspot.com/2012/07/more-data-or-better-models.html) of this which inspired this section.*


-----

![](big_complex.png)

-----

text


-----

![](big_complex_possible.png)

-----

text


...

Learn Python.
