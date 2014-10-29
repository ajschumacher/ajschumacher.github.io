# Rambling toward a definition of Big Data

<p>I was at <a href="http://www.bigdatacamp.org/ny/2013-10-27/">Big Data Camp</a> today and it made me think again about what Big Data is. Often this is phrased as "How big is big data?" and there are many answers. Sometimes the size issue is sidestepped to frame Big Data as related to structured vs. unstructured data rather than or in addition to raw size. There has been not quite a proliferation of contradictory definitions but at least a failure of one accepted definition to dominate.<br>
<br>
I offer that Big Data is Big in the literal sense, but as is so often the case it's a question of "big compared to what?". There are appropriate points of comparison, but they are not the same for every problem domain, which leads to apparently differing answers as to the size of Big Data. The appropriate point of comparison is the size of data that some existing tool can handle.<br>
<br>
Computers have been doing things like word counts for a long time, so if you're doing counting words you might not think your data is big until it no longer fits on a single machine. Putting data on multiple machines is a popular class of big data approach. Some people will argue with you about how big a single machine can be, of course, and this approach of getting a really big machine and/or getting new tools that make better use of cores or disks should also be included as Big Data approaches.<br>
<br>
Unstructured data can seem big incredibly quickly. This is not a failure of the offered definition here - this is because the existing tool for dealing with unstructured data is often "have a human look at it". So if you have enough unstructured data that it's not feasible to have a human read it all (or whatever) I would say that you could fairly call it Big Data even if it's only a few megabytes. It's differently big than word counts, certainly.<br>
<br>
A common misconception is that doing word counts is a good replacement tool for having humans read essays, for example. If you think this then you begin to conflate to two foregoing examples. Tools for analyzing natural language are so primitive that this type of mistaken thinking is understandable, but it is not correct.<br>
<br>
Upon reflection as I write this, I think that the difference in the sense of bigness is significant enough that unstructured data shouldn't be considered big in the same way that terabytes are. I think it's probably more appropriate to think of it as two separate axes, one of raw size and one of analysis complexity/difficulty. There's probably a good two-by-two matrix figure in this.<br>
<br>
Thank you, <a href="http://www.bigdatacamp.org/ny/2013-10-27/">Big Data Camp</a>&#160;NYC and <a href="http://strataconf.com/">Strata</a>, for stimulating this line of thought.<br></p>


*This post was originally hosted elsewhere.*
