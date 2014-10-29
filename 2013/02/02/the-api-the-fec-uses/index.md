# The API the FEC Uses



[I wrote this for Gelman's <a href="http://andrewgelman.com/2013/01/wanted-365-stories-of-statistics/">365 Days in Statistical Lives</a> project, but the Money in Politics <a href="http://www.bdatafest.computationalreporting.com/">Data Fest</a> is tomorrow, and there is some small chance that this might be useful for someone. Excuse the flowery details. In one sentence: The FEC doesn't officially have a public API, but they do have a publicly accessible API that you can figure out. Scroll down to code font to see an example.]

I work at&#160;<a href="http://www.nyu.edu/" target="_blank">NYU</a>. My job title is Senior Data Services Specialist.&#160;<a href="http://nyu.libguides.com/dataservices" target="_blank">Data Services</a>&#160;is a collaboration between <a href="http://library.nyu.edu/" target="_blank">Division of Libraries</a>&#160;and&#160;<a href="http://www.nyu.edu/its/" target="_blank">Information Technology Services</a>, and what we do is support members of the university community, largely graduate students, in everything from "Where can I get some data?" to "How do I get this last graph to look right?"

So we get an email from a PhD student in&#160;<a href="http://politics.as.nyu.edu/" target="_blank">politics</a>:

<blockquote>I would like to download data on campaign spending from the website of the Federal Election Commission,&#160;<a href="http://www.fec.gov/finance/disclosure/candcmte_info.shtml" target="_blank">http://www.fec.gov/finance/disclosure/candcmte_info.shtml</a>. I would like to download information on about 500 candidates for the House of Representatives, i.e. ca. 500 files. The files are under the category "Report Summaries" and should cover the "two-year period" labeled by "2010". The files that I am looking for do not seem to be accessible through a single download. At the moment, the only way that I can download the information is therefore to enter the name of the candidate, e.g. "Akin" and download the information individually which takes a long time. Would you be able to help me to speed up this process, perhaps by writing a script which would download the files based on a list of candidates?</blockquote>

My first thought, of course, is that he must be wrong. But I go and look, and sure enough there doesn't seem to be a combined file for quite what he wants. What the heck, FEC?

Generally, our librarians can help people find existing data sets, and our specialists can help people use software for their analyses. Web scraping is not really part of anybody's job description, but... maybe we do it now? I like the internet, so I decide to give it a try.

Ideally, I can do better than browser-equivalent scraping, if I can figure out what's really going on; the site gives you a CSV file after you click around for a while. Viewing source is useless, naturally. Using the Inspector in Chrome I can dig through a miserable hierarchy and eventually see that I need to know what the JavaScript function "exportCandCmteDetailCurrentSummary()" is doing. I look through a couple JavaScript files that I can see are getting pulled in. I look and I look but I can't find a definition for this function.

I don't even&#160;<i>like</i>&#160;JavaScript, but I&#160;<i>know</i>&#160;there's an HTTP request in there somewhere that I can emulate without the horrible web site, so I decide to download&#160;<a href="http://www.wireshark.org/" target="_blank">Wireshark</a>&#160;and just sniff it out. I should have started with this, because it's super easy to find, and before long I can get the files we want, by candidate ID, using&#160;<a href="http://curl.haxx.se/" target="_blank">cURL</a>.

<pre>curl -X POST -F "electionYr=2010" -F "candidateCommitteeId=H0MO02148"&#160;-F "format=csv" -F "electionYr0pt=2010"&#160;http://www.fec.gov/fecviewer/ExportCandidateCommitteeCurrentReport.do</pre>

Stick that in a little shell loop, and you can download all the files you want.

Time to meet with the patron. Of course he uses Windows, and after we wait for&#160;<a href="http://www.cygwin.com/" target="_blank">Cygwin</a>&#160;to install, cURL is mysteriously unable to find a shared object file. Fine. We can use a lab machine, which does work. We get all the files downloading.

Then we have to figure out how to combine all the files together. The role of Data Services is really to help people do things themselves, not just do things for people completely. Teach a man to fish,&#160;<a href="http://www.rushkoff.com/program-or-be-programmed/" target="_blank">Program or Be Programmed</a>... The requester has worked a little bit in&#160;<a href="http://www.python.org/" target="_blank">Python</a>, with some help, to do similar things in the past, so that's a possibility. It looks like he has&#160;<a href="http://www.stata.com/" target="_blank">Stata</a>&#160;running on his laptop, and if he wants to use that I may have to hand him off to one of our Stata experts. But it turns out that he used&#160;<a href="http://www.r-project.org/" target="_blank">R</a>&#160;quite a lot while getting his Masters, so maybe we can use that.

Luckily for everyone, he's reasonably competent with R and we're able to start writing a script together that will loop through all the candidate IDs that he's interested in and grab the data he needs from all the files. Of course the files aren't 100% consistent in their format and contents, so there are some issues to work out. I get to teach him what&#160;<a href="http://stat.ethz.ch/R-manual/R-devel/library/base/html/grep.html" target="_blank">grep</a>&#160;is.

At this point, it looks like he's going to be able to finish cleaning up his data and move on to his real focus - some sort of analysis that may shine light on the nature of politics in America. He may be the first person ever to do any sort of analysis with these particular numbers. At this point I can feel good about going to lunch.



*This post was originally hosted elsewhere.*
