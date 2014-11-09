# NYU Large Scale Machine Learning (Big Data) Lecture Two: More Methods and also LBFGS


[<a href="http://cilvr.cs.nyu.edu/doku.php?id=courses:bigdata:slides:start">Slides and video from the lectures are online!</a>]

After being packed into room 101 for week one, the class has been relocated to the expansive 109, which is big enough that we have become "<a href="http://en.wikipedia.org/wiki/Sparse_matrix">sparse</a>" - and much more comfortable!

My notes have become much longer and less coherent. I almost didn't put this up; you can, after all, see the complete <a href="http://cilvr.cs.nyu.edu/doku.php?id=courses:bigdata:slides:start">slides and video</a> online. I've decided to just review my notes and leave summarized or interesting tid-bits here, removing most of the detail.

Professor LeCun presided over the first hour, starting from "(Almost) everything you've learned about optimization is (almost) irrelevant." This is kind of funny, but also true in the sense that in machine learning, you aren't generally in the position of just adding significant digits to a known good solution - you're trying to maximize some performance which will be hurt by overfitting. So you aren't really concerned with how fast you can get more digits in your solution. ("asymptotic convergence speed is irrelevant")

Ah - a name I missed in the first lecture was "<a href="http://leon.bottou.org/">L&#233;on Bottou</a>". He may be coming in to give a guest lecture. I guess he's the guru of <a href="http://leon.bottou.org/projects/sgd">stochastic gradient descent</a>. Professor LeCun very much enjoyed putting up an image from <a href="http://en.wikipedia.org/wiki/The_Wall">Pink Floyd's The Wall</a> to dramatize the way learning time goes up seemingly exponentially when you want greater precision from SGD, which is the issue from the previous paragraph.

Another interesting device employed by Professor LeCun was his comparison of online SGD to the Linux (open source, <a href="http://en.wikipedia.org/wiki/The_Cathedral_and_the_Bazaar">bazaar vs. cathedral</a>) development model. SGD gets a quick imperfect release out quickly, and then improves it with feedback and iterations, as opposed to a batch method that has to look at all the data and really think about it for a while before it makes any model at all. Interesting.

And then we can understand why SGD takes forever to converge to high precision - looking at observations (training examples) one at a time exposes you to the raw noise of those individual observations. Professor LeCun calls this "gradient noise".

<span>An <a href="http://www.cse.unsw.edu.au/~billw/mldict.html#epoch">epoch</a> is a complete pass through your training data. Online algorithms update the model many times per epoch, whereas batch algorithms update the model only once per epoch. Professor LeCun went on to show that batch gradient descent is slow to approach a solution through areas of low loss-function curvature. Online SGD is noisier (jumps around more) but gets closer to the solution faster. (You could omit "online" before "SGD" without changing the meaning, I think.)</span>

What followed was an interesting discussion of optimizing your learning rate and how <a href="http://en.wikipedia.org/wiki/Newton%27s_method_in_optimization">Newton's method</a> is not practical (O(n<sup>3</sup>)) but equivalent to gradient descent in a particularly warped space. Unfortunately the warping is also expensive to compute.

<span>There was also some interesting connection to <a href="http://en.wikipedia.org/wiki/Principal_component_analysis">PCA</a>, and something else, and then the final conclusion seemed to be that averaging your recent models after you've done SGD for a while is a good idea because you're pretty sure you're near the solution and you can hopefully just average out the remaining noise and get even closer to the solution than just stopping SGD somewhere arbitrarily and taking whatever slightly noisy model it was on.</span>

Then there were some pretty neat demos showing the behavior of various algorithms with neat visualizations, all coded up in <a href="http://www.torch.ch/">Torch</a>. I'm not sure who did them - some student? I also hadn't realized that Torch was all done with <a href="http://www.lua.org/">Lua</a>. And the plotting was done in&#160;<a href="http://www.gnuplot.info/">gnuplot</a>, which I hadn't really seen used since I read <a href="http://shop.oreilly.com/product/9780596802363.do">Data Analysis with Open Source Tools</a>. Neat!

After a break, the lecture was handed off to Professor Langford, who was actually going to talk about a batch algorithm, which is a little out of character for him (and the class, perhaps). But it's a particularly neat algorithm! I was dismayed for a while to not know what <a href="http://en.wikipedia.org/wiki/BFGS_method">BFGS</a> stood for, so it was good to find that it's just a bunch of names. Yes four names of people who published independently but in the same year (1970) papers describing the method. Professor Langford described it as "an algorithm whose time had come." The <a href="http://en.wikipedia.org/wiki/Limited-memory_BFGS">L</a> came later (1980) and is just Limited-memory. So there's the acronym dealt with!

Professor Langford did introduce some of the possible upsides of batch algorithms - namely that they tend to be more mature, perhaps better-implemented, and also possibly better for a parallel computing environment, where online methods can be hard.

The actual method is fairly elegant and I thought Professor Langford's <a href="http://cilvr.cs.nyu.edu/diglib/lsml/lecture02-lbfgs.pdf">slides</a> and <a href="http://techtalks.tv/talks/bfgs-and-limited-storage-bfgs/57928/">explanation</a> were quite good. BFGS basically approximates difficult things like the inverse Hessian using just simple things that you have just empirically.

You do have to start BFGS with something - Professor Langford recommended always starting with online learning. Just do some online learning to get more or less close to some sort of solution, and then (L)BFGS is good at getting the higher-precision digits.

It is a little interesting that the lecture started by discounting the importance of higher-precision digits, but came back to a method for finding some. To paraphrase Professor Langford, "If you're dealing with ad display issues for major companies, it turns out that the fourth digit can actually matter." (That could be a perfect quote; check it against the video if you want.)

I got to feel slightly smart when I knew the answer to one of the questions Professor Langford offered - but the question and answer have much the same character as the old joke, "Doctor, it hurts when I move my arm like this!" "So don't move your arm like that!" The question was, "What do you do if you update your model and your loss actually goes up?" And the answer is basically, "Don't update your model like that!" Really the answer was, only update your model half as far as you were going to and see if that fixes it, and repeat until you reduce loss vs. the old model, but you get the idea. It's nice when there's a question that I can handle.

Professor Langford did go on to warn against overfitting, saying that "these things are made to optimize, and that means they will overfit if they can." He recommended some sort of regularized loss which I don't have decent notes on, and then did some demos with <a href="http://hunch.net/~vw/">vw</a>. The immediate connection back to the machine is nice in this class. It isn't just theory; there are working implementations that show you how it works. There was some discussion of how to stop and restart an algorithm (for example, with new data) by saving just some things about it. I'm really not sure why you can't just save the entire working state of the algorithm; it may have to do with good ideas regarding the Limiting of memory.

Addressing convergence, Professor Langford took a pretty pragmatic view, saying that there are some theorems, but it's rarely really quadratic, and you never perform exact line search. Also, it's an interesting thing that LBFGS is robust enough to optimize even when your function doesn't have a second derivative, and so in some sense it is (empirically) even better than Newton.



*This post was originally hosted [elsewhere](https://planspacedotorg.wordpress.com/2013/02/11/nyu-large-scale-machine-learning-big-data-lecture-two-more-methods-and-also-lbfgs/).*
