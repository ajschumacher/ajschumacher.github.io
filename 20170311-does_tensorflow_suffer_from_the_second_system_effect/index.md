# Does TensorFlow Suffer from the Second-System Effect?

In [The Mythical Man Month](https://en.wikipedia.org/wiki/The_Mythical_Man-Month), Fred Brooks includes an essay called [The Second-System Effect](http://wiki.c2.com/?SecondSystemEffect).

[![The Mythical Man Month (book cover)](img/mythical_man_month.jpg)](https://en.wikipedia.org/wiki/The_Mythical_Man-Month)

The second-system effect describes two problems likely when building a new project like one you've done before:

 * too many features: "frill after frill and embellishment after embellishment"
 * focus on the wrong features: "a tendency to refine [obsolete] techniques"

The "too many features" problem is the one most commonly associated with the second-system effect.

---

[TensorFlow](https://www.tensorflow.org/) is a second system, in that Google had a system called [DistBelief](https://static.googleusercontent.com/media/research.google.com/en//archive/large_deep_networks_nips2012.pdf), and TensorFlow is [explicitly](http://download.tensorflow.org/paper/whitepaper2015.pdf) the second-generation system based on experience with DistBelief.

[![TensorFlow](img/tensorflow.jpg)](https://www.tensorflow.org/)

TensorFlow has a _lot_ of features. It aims to support research as well as production, running on multiple processing targets (CPU, GPU, etc.) on single devices and distributed, on mobile devices, workstations, and data centers. It includes a visualization system. It includes a serving system. It includes a compiler. It includes multiple high-level APIs. The tagline it uses is [Machine Learning for Everyone](https://www.youtube.com/watch?v=mWl45NkFBOc).

TensorFlow may not focus on obsolete features, but it also doesn't necessarily focus on features that matter to every user. The fundamental design priority of the computation graph, which then supports device-specific optimization and distributed execution, also introduces conceptual and computational overhead that may do more harm than good for users who won't use these features.

---

While TensorFlow could be seen as a second system, and has some possible symptoms of the second-system effect, criticism of TensorFlow is rare.

Do people love TensorFlow as much as it seems they do? Or are some people quietly griping about (or just ignoring) TensorFlow, with issues like [FFT](https://en.wikipedia.org/wiki/Fast_Fourier_transform) being supported on GPU but not CPU?

Is the second-system effect no longer relevant? The Mythical Man-Month was published in 1975. Using 26 bytes to handle leap years was an example of second-system excess for Brooks. And this was a [waterfall](https://en.wikipedia.org/wiki/Waterfall_model) closed-source world.

Brooks also focused on individuals: the second-system effect was specifically about second systems _for individual developers_ (or architects). TensorFlow is certainly not the second system [Jeff Dean](https://www.quora.com/What-are-all-the-Jeff-Dean-facts) has been involved with. Maybe Google's engineering culture is so good, the second-system effect is no match for it.

Or was the second-system effect never really a useful idea? Second systems have always had the benefit of experience, as much or more than the temptation of feature creep.
