# Two Highlights from NY R Conference 2015

Here are the two things I thought were most interesting at [NY R](http://www.rstats.nyc/) on Saturday April 25, 2015:

---

![MRAN](mran.png)

[Joe Rickert](https://twitter.com/revojoe) showed [Revolution Analytics](http://www.revolutionanalytics.com/)' [Managed R Archive Network](http://mran.revolutionanalytics.com/) (MRAN). It snapshots all of [CRAN](http://cran.r-project.org/) every day so that you can finally do a real lock-in of the versions for all your R dependencies, using the [checkpoint](http://cran.r-project.org/web/packages/checkpoint/index.html) package. This was [announced](http://blog.revolutionanalytics.com/2014/10/introducing-rrt.html) a while ago, but it was new to me. I love any sort of data store that gives you `as-of`, even if it's just by snapshotting.

---

[Wes McKinney](https://twitter.com/wesmckinn) spoke about data frame design and how such tooling should develop further. Here's a transcription of a key [slide](https://twitter.com/planarrowspace/status/591990689635905536):

 * **The Great Data Tool Decoupling™**
     * Thesis: over time, user interfaces, data storage, and execution engines will decouple and specialize
     * In fact, you should really want this to happen
         * Share systems among languages
         * Reduce fragmentation and "lock-in"
         * Shift developer focus to usability
     * Prediction: we'll be there by 2025; sooner if we all get our act together

I've thought about this kind of decoupling for data visualization (see [gog](http://planspace.org/20150119-gog_a_separate_layer_for_visualization/)) and I think it's a cool direction in general.

---

There were certainly other interesting and good things as well!
