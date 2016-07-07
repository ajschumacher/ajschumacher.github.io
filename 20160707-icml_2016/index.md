# Highlights from ICML 2016

I was fortunate to attend the [International Conference on Machine Learning](http://icml.cc/) in New York from June 19-24 this year. There were walls and walls of multi-arm bandit posters (etc.) but I mostly checked out neural net, deep learning things. Here are my highlights.

In general: People are doing so many interesting things! Wow. Too many things to try. Architectures are more complex and more flexibly experimented with, it seems. And everybody loves [batch norm](https://arxiv.org/abs/1502.03167). I didn't see anything that seemed like a huge conceptual breakthrough that would change the direction of the field, but maybe I'm wishing for too much, maybe the field doesn't need such a thing, or maybe it was there and I missed it!

For my breakdown of the conference _structure_ itself, see [Conferences: What is the Deal?](/20160703-conferences_what_is_the_deal/).

---

Flashiest paper award: [Generative Adversarial Text to Image Synthesis](https://arxiv.org/abs/1605.05396) is a system where you put in text and the computer makes a picture.

[![birds](img/birds.png)](https://arxiv.org/abs/1605.05396)

Good job, computer!

---

Best talk award: [Machine Learning Applications at Bell Labs, Holmdel](http://www.slideshare.net/ajschumacher/machine-learning-applications-at-bell-labs-holmdel) was Larry Jackel's history of neural nets, starting back in 1976. Great perspective and personal stories, presented as part of [Neural Nets Back to the Future](https://sites.google.com/site/nnb2tf/).

[![bets](img/bets.png)](http://www.slideshare.net/ajschumacher/machine-learning-applications-at-bell-labs-holmdel)

Yes, Jackel's bets involve the [V](https://en.wikipedia.org/wiki/Vladimir_Vapnik) of [VC Dimension](https://en.wikipedia.org/wiki/VC_dimension), the [Le](https://en.wikipedia.org/wiki/Yann_LeCun) of [LeNet](http://yann.lecun.com/exdb/lenet/), and SGD-master [Bottou](https://en.wikipedia.org/wiki/L%C3%A9on_Bottou).

---

The first [tutorial](http://icml.cc/2016/?page_id=97) I heard was from [Kaiming He](http://kaiminghe.com/) on [Deep Residual Networks](http://icml.cc/2016/tutorials/icml2016_tutorial_deep_residual_networks_kaiminghe.pdf). ResNets and their cousins (like [highway networks](http://people.idsia.ch/~rupesh/very_deep_learning/)) succeed essentially because wiggling a little tends to be better than going somewhere entirely different.

The intuition: It's hard to train deeper networks. But they ought to be better! Well, if we take a net and add another layer that encodes the identity, that's deeper, and exactly as good! What if all the layers were like the identity plus a little bit that's learned?

I was also impressed that, for example, a 152-layer ResNet can have fewer parameters than a 16-layer VGG net. Models aren't always getting more complex in terms of number of parameters!

Slightly more: If you're careful where you put nonlinearities, it's like you're always [adding](https://twitter.com/planarrowspace/status/744525688829534208) instead of multiplying! Stacking two convolutional layers before "reconnecting" works better in practice than doing one or three!

Boom: you can train a model with a thousand layers.

---

The second tutorial I [heard](https://twitter.com/planarrowspace/status/744545675896033280) was from [Jason Weston](http://www.thespermwhale.com/jaseweston/) on [Memory Networks for Language Understanding](http://www.thespermwhale.com/jaseweston/icml2016/). Interesting references:

 * [A Roadmap towards Machine Intelligence](http://arxiv.org/pdf/1511.08130v2.pdf)
 * [Teaching Machines to Read and Comprehend](http://arxiv.org/pdf/1506.03340v3.pdf)
 * [Towards AI-Complete Question Answering: A Set of Prerequisite Toy Tasks](https://arxiv.org/abs/1502.05698)
 * [bAbI natural language tasks](https://research.facebook.com/research/babi/)

It was neat seeing what can and can't be done currently for the "toy tasks." And Weston was [stylish](https://twitter.com/planarrowspace/status/744549249019437062).

---

The third tutorial I heard was [David Silver](http://www0.cs.ucl.ac.uk/staff/d.silver/web/Home.html)'s on [Deep Reinforcement Learning](http://hunch.net/~beygel/deep_rl_tutorial.pdf) (with [bonus deck on AlphaGo](http://icml.cc/2016/tutorials/AlphaGo-tutorial-slides.pdf)). Reinforcement learning is a big deal and getting bigger, it seems. I should really get into it more. Silver has [course materials](http://www0.cs.ucl.ac.uk/staff/d.silver/web/Teaching.html) on his site. Also, [OpenAI](https://openai.com/) is into it, and they have a whole [OpenAI Gym](https://gym.openai.com/) where you can play with things. Neat!

---

I liked the problem statement and solution of CReLUs. Too briefly: With ReLUs you tend to get paired positive/negative filters because one filter can't represent both. So build pairing into your system, and things work better. Very cogent content. Paper: [Understanding and Improving Convolutional Neural Networks via Concatenated Rectified Linear Units](https://arxiv.org/abs/1603.05201)

---

On sizing layers, an [SVD approach](https://twitter.com/planarrowspace/status/745602200366354432) based on statistical structure in the weights was interesting. Paper: [A Deep Learning Approach to Unsupervised Ensemble Learning](https://arxiv.org/abs/1602.02285)

---

[Discrete Deep Feature Extraction: A Theory and New Architectures](https://arxiv.org/abs/1605.08283) is a little math-heavy but close to interesting ideas about understanding and using the internals of neural networks.

---

[Autoencoding beyond pixels using a learned similarity metric](https://arxiv.org/abs/1512.09300) does neat things using the internals of a network for more network work - it might be metaphorically "reflective" - and comes up with some flashy visual results, too.

---

[Semi-Supervised Learning with Generative Adversarial Networks](https://arxiv.org/abs/1606.01583) shows that a fairly natural idea for GANs does in fact work: you can use labels like "real_a, real_b, real_c, fake" instead of just "real, fake".

> We show that this method can be used to create a more data-efficient classifier and that it allows for generating higher quality samples than a regular GAN.

---

[Fixed Point Quantization of Deep Convolutional Networks](https://arxiv.org/abs/1511.06393) was pretty neat, if you're into that kind of thing.

---

I really liked the [Neural Nets Back to the Future](https://sites.google.com/site/nnb2tf/) workshop.

![Back to the Future](img/bttf.jpg)

I was so interested in the historical perspective from the experienced people presenting, for a while I was [tweeting](https://twitter.com/planarrowspace/status/745958455865933824) every slide.

---

From pictures I took (and [tweeted](https://twitter.com/planarrowspace/status/745959355724468224)) I reconstructed [slides](http://www.slideshare.net/ajschumacher/machine-learning-applications-at-bell-labs-holmdel) for "Machine Learning Applications at Bell Labs, Holmdel" from Larry Jackel, as mentioned above.

---

I also [tweeted](https://twitter.com/planarrowspace/status/745972920040689664) all through Gary Tesauro's talk, but thought it was of less general interest.

---

Patrice Simard's [Backpropagation without Multiplication](http://papers.nips.cc/paper/833-backpropagation-without-multiplication) was fascinating, and much better for his commentary. For example:

> Discretizing the gradient is potentially very dangerous. Convergence may no longer be guaranteed, learning may hecome prohibitively slow, and final performance after learning may be be too poor to be interesting,

Simard said that quote from the paper isn't really true; you can just use his method without worrying about that. This is a quote I [took down](https://twitter.com/planarrowspace/status/746035221318012928) as he was speaking:

> Gradient descent is so robust to errors in the gradient, your code probably has bugs, but you don't need to fix them.

---

During a panel discussion, Yann LeCun said max pooling makes adversarial training unstable, and so it's better to use strided convolution if you want to downsample.

Later I noticed related sentiment in Karpathy's [notes](http://cs231n.github.io/convolutional-networks/):

> *Getting rid of pooling.*​ Many people dislike the pooling operation and think that we can get away without it. For example, [Striving for Simplicity: The All Convolutional Net](http://arxiv.org/abs/1412.6806) proposes to discard the pooling layer in favor of architecture that only consists of repeated CONV layers. To reduce the size of the representation they suggest using larger stride in CONV layer once in a while. Discarding pooling layers has also been found to be important in training good generative models, such as variational autoencoders (VAEs) or generative adversarial networks (GANs). It seems likely that future architectures will feature very few to no pooling layers.

---

[Barak Pearlmutter](http://www.bcl.hamilton.ie/~barak/) gave a [talk](https://sites.google.com/site/nnb2tf/abstracts#pearlmutter) about automatic differentiation and a really fast system called vlad that I think runs on [stalin](https://github.com/barak/stalin). Pretty impressive speed! Following up later he did add:

> keep in mind that if all your computations are actually array
> operations on the GPU, which takes all the time, then the overhead
> of the AD system might not really matter since it's just scheduling
> the appropriate derivative-computing array operations on the GPU.

The next day [Ryan Adams](https://twitter.com/ryan_p_adams) gave a talk on the same topic at the [AutoML workshop](https://sites.google.com/site/automl2016/scientific-program) featured a Python [autograd](https://github.com/HIPS/autograd) package that seemed to have some of the features (closure, for example) as vlad.

Everybody loves automatic differentiation!

---

I was briefly at the [Workshop on On-Device Intelligence](https://sites.google.com/site/ondeviceintelligence/icml2016) but ended up wandering.

---

I visited the [Data-Efficient Machine Learning](https://sites.google.com/site/dataefficientml/) workshop and saw [Gelman](http://andrewgelman.com/)'s [amusing](https://twitter.com/planarrowspace/status/746357503009689601) talk called Toward Routine Use of Informative Priors.

---

I spent some time at the [Machine Learning Systems](https://sites.google.com/site/mlsys2016/schedule) workshop.

Unfortunately I missed [Yangqing Jia](http://daggerfs.com/)'s [Towards a better DL framework: Lessons from Brewing Caffe](https://docs.google.com/viewer?a=v&pid=sites&srcid=ZGVmYXVsdGRvbWFpbnxtbHN5czIwMTZ8Z3g6NGM3ZTgxYmYyZDBiM2VjNA).

I did see [Design Patterns for Real-World Machine Learning Systems](http://www.slideshare.net/justinbasilico/is-that-a-time-machine-some-design-patterns-for-real-world-machine-learning-systems), at which I was impressed at the [number](https://twitter.com/planarrowspace/status/746394115240239105) of named machine learning design patterns at Netflix.

---

I closed out the conference at the [AutoML workshop](https://sites.google.com/site/automl2016/scientific-program). Of possible interest in connection with this topic is a recent [DARPA effort](http://www.darpa.mil/news-events/2016-06-17).
