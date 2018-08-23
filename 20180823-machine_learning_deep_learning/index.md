# Machine learning / Deep learning

I participated in a
[panel](https://www.meetup.com/TechinMotionDC/events/252910659/) on
deep learning yesterday, so I thought about some of the introductory
questions and wrote out my responses.

---

### How would you define machine learning?

Machine learning is programming with examples instead of instructions.

It's a way to get computers to do something: in that sense it's
"programming." It's been called
[Software 2.0](https://medium.com/@karpathy/software-2-0-a64152b37c35).

Usually we program by writing explicit instructions, step by step.
With machine learning, we program using examples, by which I mean
data.

Say that programming is writing functions, which is basically right. A
function takes some input and returns some output.

[Higher-order programming](https://en.wikipedia.org/wiki/Higher-order_programming)
involves functions as the inputs and outputs of other functions, and
machine learning is a specific kind of higher-order programming.

Machine learning is done by a function that takes data (examples) as
input and produces a function as output. Running that higher-order
function is when machine learning takes place. We say that we learn a
function.

Sometimes learned functions are called models, and learning them is
sometimes called training or fitting.

There can also be functions that learn functions that learn functions,
as in [Neural Architecture Search](https://arxiv.org/abs/1611.01578),
which involves machine learning at multiple levels.


### What is deep learning? What is the difference between deep learning and machine learning?

Deep learning is machine learning where the function you're learning
has a particular style of implementation.

In deep learning, the learned function has an internal implementation
involving one or more intermediate representations.

Aspects of these intermediate stages are sometimes called layers or
activations.

The number of layers is how we measure the depth of the model.

I don't care to argue about how many layers you "need" to be "deep."
As far as I'm concerned if there's more than zero intermediate
representations, you can call it deep if you want to. But it's common
to have five, ten, twenty, or more layers.

Usually, but not always, when people talk about deep learning they're
also talking about neural nets, and usually using
[backpropagation](https://en.wikipedia.org/wiki/Backpropagation).

The reason people care about deep learning is that it performs better
than many machine learning alternatives on a lot of hard problems
typically involving high-dimensional inputs, like images, audio, and
text.

---

Cassie Kozyrkov's [talk](https://www.youtube.com/watch?v=iLu9XyZ55oI)
has a number of useful metaphors for machine learning in practice and
I found it helpful for thinking about how to explain things to a
general audience.
