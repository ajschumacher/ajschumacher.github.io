# Writing with O'Reilly

[O'Reilly Media](http://www.oreilly.com/) is tech publishing brand best known for its iconic [books](http://shop.oreilly.com/). They're also the force behind a number of [conferences](http://www.oreilly.com/conferences/) and they've been publishing more web content in their [Ideas](https://www.oreilly.com/ideas) and [Learning](https://www.oreilly.com/learning) sections. I'm very excited to now be able to contribute a small article which will join their site. "[Hello, TensorFlow!](https://www.oreilly.com/learning/hello-tensorflow)" should be live at 7am EDT on Monday July 20, 2016. It was a fun experience getting it there, and I thought I'd describe the process.


### Summary

 * Inception: Connections, Initiative, Luck
 * Editing: Markdown, Google Doc, Web Publishing
 * Publishing: Adventure!


### Inception

The post was born through a combination of connections, some initiative, and good fortune.

I work at [Deep Learning Analytics](http://www.deeplearninganalytics.com/) (DLA) and [Paco](https://twitter.com/pacoid) at O'Reilly knows our group's leader, John. I think it was Paco who originally proposed a discussion about DLA and O'Reilly doing something together. This led to a call between [Ben](https://twitter.com/bigdata) and [Marie](https://twitter.com/cmariebeau) from O'Reilly and John and I from DLA. I joined because I've done some blogging and teaching and am interested in such things. (It was surprisingly weird to be on a phone call with Ben after hearing his voice in my headphones during so many episodes of the [O'Reilly Data Show](http://radar.oreilly.com/tag/oreilly-data-show-podcast).) Nothing came directly of our initial call aside from establishing that there was  interest that could eventually take some real form.

Months later, I was starting to play with TensorFlow on my own time, collecting some notes as I went along, and starting to think about shaping them into a post for my personal blog. I guess I mentioned this to John, who suggested that we cultivate the content a little more and see if it would work as a post for O'Reilly. I was very fortunate in this connection to have the support of DLA to spend some more time writing the post, and to get initial feedback from a number of DLA colleagues.

After a draft was together, we sent it off to Marie to see if O'Reilly would be interested. Sure enough there was interest, and we moved on to editing. Sometimes O'Reilly republishes existing blog posts, but in this case it wasn't yet published anywhere and Marie wanted to do a round of editing, which I think has turned out to be a very good idea.

It is interesting how various publishers find things to publish. I've talked to "acquisitions editors" who are looking for people to write books, and I occasionally hear from people who want to republish a blog post or solicit new posts. Everybody wants content. The ease of publishing means anybody can write a book, and a lot of publishers seem to be going for long tail content, or even just _anything_ new.

I think O'Reilly is the most discerning of the tech publishers. Aside from liking the people who work there, it's their good reputation that made putting an article on their site attractive to me. I mean, this is the house of [the camel book](http://shop.oreilly.com/product/9780596004927.do)! That reputation also motivates linking DLA and O'Reilly, however indirectly. The apparent editorial policy of O'Reilly to not do sponsored content or other branding tie-ins preserves their status and makes them the more attractive as an ally.


### Editing

I write generally pretty raw unedited posts (such as this one) for my blog, and I had heard that O'Reilly had cool processes in place for the editing and publishing process, so I was curious to see what it would be like working with them. The article went through three stages, first as markdown, then as a Google Doc, and then in the O'Reilly web publishing platform.

I almost always write text files with just a little bit of [markdown](https://daringfireball.net/projects/markdown/) syntax ([more details](http://planspace.org/20160209-how_i_blog/)). For the TensorFlow post, I got feedback on this form first from colleagues at [DLA](http://www.deeplearninganalytics.com/), which included [slack](https://slack.com/) comments, email comments, and a pull request. Also, the local [machine learning journal club](http://www.meetup.com/DC-Machine-Learning-Journal-Club/) has been working with TensorFlow, and they generously allowed me to present a version at one of their meetups. That experience led to a number of changes, such as clarifying the distinction between graphs and sessions.

Once I had the draft ready I sent it off as a zip file (including images) to Marie, O'Reilly's lead data editor. Marie put my content into a [Google Doc](https://www.google.com/docs/about/). I never saw Google Docs used so well. It helped that her edits were good, but she also made expert use of change tracking and commenting so that everybody knew what was going on, and I could confirm changes or discuss alternatives. I still prefer the peace of mind of git, but the ease of use of Google Docs combined with Marie's thoroughness was remarkably satisfying.

In terms of the actual content of the edits, I was incredibly pleased. It has been my experience in the past that collaborative document editing can be among the most painful of endeavors. One manifestation of this is when a collaborator makes changes that decrease the quality of the document. Fortunately my experience here was quite the reverse. Thanks Marie! As one example, my original title was "TensorFlow from the Plumbing Up." John had suggested "Hello TensorFlow Graph" or something like that. When Marie changed it to "Hello, TensorFlow!" it was clear it should never have been anything else.

We spent some time working with the Google Doc version, and then passed it off to Jenn, O'Reilly's online managing editor. (You may know Jenn's voice from [O'Reilly Radar](http://radar.oreilly.com/tag/oreilly-radar-podcast)!) Jenn put the content into the O'Reilly web system, where it appeared to us in read-only preview form behind a login. After a couple rounds of emails for final adjustments, it was ready to go and the publish date was set. I think it looks really nice now - thanks Jenn!

There was a little bit of friction around the transitions from system to system (markdown to google doc to web publishing system). If I was the dictator of systems I guess I would keep everything markdown, but that probably wouldn't have all the features that the O'Reilly publishing system needs, and I don't know of any markdown applications that have all the collaboration features and ease of use that you get with Google Docs. It's really interesting to me the systems and processes that turn out existing in the world; often they seem to grow more than be built, and even for things that seem like they should be easy it often turns out that there are a lot of details in the way. The system we used worked for us, but it definitely required the expert handling of its masters.


### Publishing

Everything was ready on Friday afternoon, but we agreed that it would be best to run the post on Monday morning. This is presumably because people are much more likely to read it when they're supposed to be working than when they have free time. (I understand this, but I still think it's funny.)

The last email we exchanged looped in three more O'Reilly folks who do marketing things, as I understand it. I'm curious to see what this will mean for a simple blog post like this.

The [O'Reilly learning](https://www.oreilly.com/learning) site is really beautiful, with great fonts and all those things publishers care about. I'm super excited to see our post up there!

Dropping Monday June 20: [Hello, TensorFlow!](https://www.oreilly.com/learning/hello-tensorflow) I hope it's not so awful that it irritates Google or other TensorFlow developers and users!
