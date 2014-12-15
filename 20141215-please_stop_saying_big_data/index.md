# Please stop saying “Big Data”


*A short talk for [AIR](http://www.air.org/).*


-----

![](alan_kay.jpg)

-----

This is [Alan Kay](http://en.wikipedia.org/wiki/Alan_Kay). He worked at Xerox PARC, he said “The best way to predict the future is to invent it,” and he also said this, at a [talk](https://www.youtube.com/watch?v=gTAghAJcO1o) earlier this year:

> Big data is a way that a lot of people are trying to make money today. And it's a favorite of marketing people, because it's in the wind. Everybody has heard the phrase “big data.” Not everybody knows what it means. And so it's the perfect context for doing things that people can say, “Well this is an application of big data and this is an application of big data.” But in fact, the interesting future's not about data at all - it's about meaning.

The objection here which is an objection of many is an objection to torturing the phrase “Big Data” until it means everything and nothing.

You can also read an article that Deloitte published last Wednesday on the Wall Street Journal's web site called [Should We Stop Using the Term ‘Big Data’?](http://deloitte.wsj.com/cio/2014/12/10/should-we-stop-using-the-term-big-data/).

The answer is yes, let's all stop saying “big data” when we just mean “data.”


-----

![](excel.png)

-----

Some people think big data is data they can't put in Excel. The problem with this thinking is that you shouldn't be putting *any* data in Excel. There are many reasons Excel is bad. If you care about getting the right answer, you shouldn't use Excel [1]. But it is also true that more and more, we've moved from the era of “shouldn't use Excel” to the era of “can't possibly use Excel.”

The reasons you can't use Excel these days can include volume, velocity, variety, and veracity, those [V words](http://www.ibmbigdatahub.com/infographic/four-vs-big-data) that buzz along with “big data.” These Vs are trying to get people to realize that their ideas about how to work with data are inadequate. The ideas were inadequate before as well, but now they're really clearly inadequate. It is more comfortable to think that the problem is only with these new-seeming Vs.

[1]: *See, for example [Growth in a Time of Debt](http://www.businessweek.com/articles/2013-04-18/faq-reinhart-rogoff-and-the-excel-error-that-changed-history).*


-----

![](data_flow.jpg)

-----

Working with data is always about building systems. This includes systems where the output is an analysis result. You need to build systems that are testable, reusable, extensible, and composable. Ideally, systems that are elegant. You can't do that with Excel, or with most of the commercial statistical offerings. To steal some other peoples' language, [software is eating the world](http://www.wsj.com/articles/SB10001424053111903480904576512250915629460) and you need to [program or be programmed](http://www.rushkoff.com/program-or-be-programmed/).

What should you learn, if all you know is Excel or something similarly unfortunate like Stata or SAS? If you think you should learn [R](http://www.r-project.org/) or [Clojure](http://clojure.org/) or [Scala](http://www.scala-lang.org/), you might be right. Otherwise, learn [Python](https://www.python.org/).


-----

![](big_data.png)

-----

There is a useful meaning for the phrase “big data”, [courtesy](http://people.cs.umass.edu/~mcgregor/stocworkshop/langford.pdf) of [John Langford](http://en.wikipedia.org/wiki/John_Langford_%28computer_scientist%29).

It's not quite the same thing as being “O(n<sup>2</sup>) algorithm feasible,” but to put it differently, let's say that some small data you could theoretically work with in Excel.

Medium data might fit on one computer, but to work with it you'll probably need someone who knows what “O(n<sup>2</sup>)” means. She started programming years before you, and you probably want her working on your small data too.

Very few people have big data by the definition here, and that's okay.

Second recommendation: if you do have really big data, learn [Spark](https://spark.apache.org/).


-----

![](unreasonable_data.png)

-----

Is more data better? This question is distinct from the question of whether our data is big. Do we want more data at all?

In 2009, some folks at Google come out with [The Unreasonable Effectiveness of Data](http://static.googleusercontent.com/media/research.google.com/en/us/pubs/archive/35179.pdf). They seem to be saying that there is at least one case in which the answer is yes, we want more data.


-----

![](scaling_corpora.png)

-----

A good illustration of their point is a [2001 Microsoft paper](http://dl.acm.org/citation.cfm?id=1073017). The problem here is called confusion set disambiguation, which sounds fancy but just means that the model has to decide whether to fill in a blank in a sentence with T-O to, T-O-O too, or T-W-O two. So the data is text, and the point is that the amount of data seems to be more important than the choice of algorithm. There are three things to say here.

First, is this big data? Their complete data set was a billion words. Around five gigabytes. This is not an example of big data.

Second, how are we measuring effectiveness? This is an important thing to take from this example. The Y axis is prediction accuracy on a test set. The model sees some training data, and then we ask it to predict for separate test data, and we see how often it's right. This is a predictive framing of the problem, which is powerful. It's the scientific method: the model is correct to the extent it makes correct predictions. But it doesn't make much sense to try to interpret these models in any way that would please a traditional linguist.

Finally, should we be surprised? The problem these models are attacking is a natural language problem. Language is complicated, and all these models are trying to overcome [the poverty of the stimulus](http://en.wikipedia.org/wiki/Poverty_of_the_stimulus). So it makes sense that they should do better when they get to study more text.

So here is a problem where more data is better. Are all problems like this?

No!

What is it about this problem that makes more data better?

These models are high variance, meaning roughly that they have a ton of coefficients [2]. This is not so different from having relatively small data for the rarer words, as it were. And adding data was easy, since they just grabbed more free text from the internet. And perhaps most importantly, they had already taken what sounds like a complicated problem (natural language processing) and simplified it down to a very narrow problem with well-defined models and a success metric.

[2]: *[Xavier Amatriain](http://xavier.amatriain.net/) (formerly of Netflix) has a good [explanation](http://technocalifornia.blogspot.com/2012/07/more-data-or-better-models.html) of this which inspired this section.*


-----

![](big_complex.png)

-----

text


-----

![](big_complex_possible.png)

-----

text

