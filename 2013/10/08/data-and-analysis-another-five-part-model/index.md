# Data and Analysis: another five-part model



Learning from data is not a simple linear process. The following five parts are all essential and interconnected, with the data itself central but far from the most important component.

<a href="screen-shot-2013-10-07-at-7-12-42-pm.png"><img class=" wp-image-357 aligncenter" alt="phenomenon of interest - data creation - data - analysis - system of beliefs" src="screen-shot-2013-10-07-at-7-12-42-pm.png"></a>

If your goal is to achieve a correct&#160;system of beliefs about the phenomenon of interest, it is important to attend to all the components of this superficially simple model and work to understand their connections.

Your system of beliefs is involved from the very start. Among the components of Conway's <a href="http://drewconway.com/zia/2013/3/26/the-data-science-venn-diagram">data science Venn diagram</a>, subject matter expertise is sometimes viewed as unnecessary by those more interested in algorithms than science, but if the goal is learning about something in the world on the basis of data, you have to know something to start with. The absoluteness of this claim might be a little subtle and some people disagree - <a href="http://en.wikipedia.org/wiki/G%C3%B6del,_Escher,_Bach">Hofstadter</a> for one, I think - while <a href="http://en.wikipedia.org/wiki/Embodied_cognition">others</a> seem to generally be on board.

A simple example: you look at a data set of library visit timestamps and see that there are no visits on Wednesdays:

<ul>
	<li>Phenomenon of interest: Is the library closed on Wednesdays? Is it open but nobody goes to the library on Wednesdays because of the great deals at Sal's Diner?</li>
	<li>Data creation: Is there a bug in the logging software that makes it fail on Wednesdays? Is Andy supposed to manually record the data but he goes to Sal's on Wednesdays? Are the timestamps systematically off by a couple days, so that Wednesday means Sunday?</li>
	<li>Data: The data is taken to exist, but any deterioration to it over time or problems in reading it can be attributed to the creating or analysis components.</li>
	<li>Analysis: Did an earlier stage of analysis drop all Wednesday data for some reason? Did the analysis read in the dates incorrectly, so that Wednesday really means Sunday?</li>
	<li>System of beliefs: Which of the above is most likely? How could you check? Is this Wednesday issue interesting? Is it worth pursuing further? But also:&#160;How many visitors are represented by each timestamp? Are there timestamps for both arrivals and exits? And: Is it good or bad if there are a lot of visitors? And of course: How should the analysis be changed? What should we believe?</li>
</ul>
If you think everything that you see in your data is an accurate signal about the phenomenon you're interested in, you are likely to be wrong often and in ways you would much rather avoid.

I was thinking about this just before I had the pleasure of reading Victor's <a href="http://worrydream.com/MagicInk/">Magic Ink</a>, where I <a href="http://worrydream.com/MagicInk/#p252">found</a> this similar model, itself "* Adapted from Claude Shannon,&#160;<a href="http://cm.bell-labs.com/cm/ms/what/shannonday/shannon1948.pdf">A Mathematical Theory of Communication</a>&#160;(1948), p2.":

<a href="shannon.png"><img class="aligncenter size-full wp-image-364" alt="shannon" src="shannon.png"></a>

This is interestingly parallel to the data/analysis model above. A type of difference to articulate is that commonly, for the data analyst, the phenomenon of interest is not <em>trying to</em>&#160;communicate. And the "tool" is not necessarily designed for the purpose it finds itself being used for. And of course, the analyst is usually at least to some extent building and being the platform and user on an ongoing and iterative basis.

In all cases, the optimal success of learning on the right hand side hinges on appropriate meta-awareness of the whole process.



*This post was originally hosted [elsewhere](https://planspacedotorg.wordpress.com/2013/10/08/data-and-analysis-another-five-part-model/).*
