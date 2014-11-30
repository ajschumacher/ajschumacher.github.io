# I want an edit button on everything


My blog does not have an edit button for people who are not me. This means it takes a bunch of work to fix a typo, for example: you'd have to tell me about it, describing where the typo is, somehow, and then I would have to go find the spot, and make the change. In practice, this pretty much doesn't happen.

Wikipedia has edit buttons on everything, and so does <a href="https://github.com/">github</a>. I'm not entirely sure what is best between allow-all-edits-immediately and require-review-for-all-edits. Some mix is also possible, I guess. Wikipedia has ways to lock down articles, and must have corresponding permission systems for who can do/undo that. Github lets you give other people full edit permissions, so you can spread the editor pool at least. Git by itself can support even more fine-grained control, I believe.

I'd like to move my blog to something git-backed, like github pages. It's a little work, but you can put an edit button on the rendered HTML views shown by github pages too. <a href="http://adv-r.had.co.nz/">Advanced R</a> has a beautiful "Edit this page" button on every page. Three.js has one in their <a href="http://threejs.org/docs/#Manual/Introduction/Creating_a_scene">documentation</a>. Eric <a href="https://konklone.com/post/writing-in-public-syncing-with-github">points out</a> Ben's <a href="http://ben.balter.com/">blog</a> as well, and also the trouble with comments.

Ideally I'd prefer not to be github-bound, I guess, or bound to some comment service. But I also kind of prefer to have everything text-based, so what do you do for comments then? And also I'd like to be able to do R markdown (etc.) and have that all render automagically. But also something serverless. I'm drawn to <a href="https://github.com/Xeoncross/jr">this javascript-only static static generator</a>, but that also seems to be A Bad Idea.

So: that solves that.



*This post was originally hosted [elsewhere](https://planspacedotorg.wordpress.com/2014/08/31/i-want-an-edit-button-on-everything/).*
