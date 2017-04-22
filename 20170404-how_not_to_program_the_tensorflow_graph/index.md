# How Not To Program the TensorFlow Graph


Using TensorFlow from Python is like using Python to program [another computer](/20170328-tensorflow_as_a_distributed_virtual_machine/). Some Python statements build your TensorFlow program, some Python statements execute that program, and of course some Python statements aren't involved with TensorFlow at all.

Being thoughtful about the graphs you construct can help you avoid confusion and performance pitfalls. Here are a few considerations.


## Avoid having many identical ops

<!-- Better re-write; maybe separate out a section about Python names for TF ops, losing references to your ops, etc. -->

Lots of methods in TensorFlow create ops in the computation graph, but do not execute them. You may want to execute multiple times, but that doesn't mean you should create lots of copies of the same ops.

A clear example is `tf.global_variables_initializer()`.

```python
>>> import tensorflow as tf
>>> session = tf.Session()
# Create some variables...
>>> initializer = tf.global_variables_initializer()
# Variables are not yet initialized.
>>> session.run(initializer)
# Now variables are initialized.
# Do some more work...
>>> session.run(initializer)
# Now variables are re-initialized.
```

If the call to `tf.global_variables_initializer()` is repeated, for example directly as the argument to `session.run()`, there are downsides.

```python
>>> session.run(tf.global_variables_initializer())
>>> session.run(tf.global_variables_initializer())
```

A new initializer op is created every time the argument to `session.run()` here is evaluated. This creates multiple initializer ops in the graph. Having multiple copies isn't a big deal for small ops in an interactive session, and you might even want to do it in the case of the initializer if you've created more variables that need to be included in initialization. But think about whether you need lots of duplicate ops.

Creating ops inside `session.run()`, you also don't have a Python variable referring to those ops, so you can't easily reuse them.

In Python, if you create an object that nothing refers to, it can be garbage collected. The abandoned object will be deleted and and memory it used will be freed. That doesn't happen to things in the TensorFlow graph; everything you put in the graph stays there.

It's pretty clear that `tf.global_variables_initializer()` returns an op. But ops are also created in less obvious ways.

Let's compare to how NumPy works.

```python
>>> import numpy as np
>>> x = np.array(1.0)
>>> y = x + 1.0
```

At this point there are two arrays in memory, `x` and `y`. The `y` has the value 2.0, but there's no record of _how_ it came to have that value. The addition has left no record of itself.

TensorFlow is different.

```python
>>> x = tf.Variable(1.0)
>>> y = x + 1.0
```

Now only `x` is a TensorFlow variable; `y` is an `add` op, which can return the result of that addition if we ever run it.

One more comparison.

```python
>>> x = np.array(1.0)
>>> y = x + 1.0
>>> y = x + 1.0
```

Here `y` is assigned to refer to one result array `x + 1.0`, and then reassigned to point to a different one. The first one will be garbage collected and disappear.

```python
>>> x = tf.Variable(1.0)
>>> y = x + 1.0
>>> y = x + 1.0
```

In this case, `y` refers to one `add` op in the TensorFlow graph, and then `y` is reassigned to point to a different `add` op in the graph. Since `y` only points to the second `add` now, we don't have a convenient way to work with the first one. But both the `add` ops are still around, in the graph, and will stay there.

(As an aside, Python's mechanism for defining class-specific addition [and so on](http://www.python-course.eu/python3_magic_methods.php), which is how `+` is made to create TensorFlow ops, is pretty neat.)

Especially if you're just working with the default graph and running interactively in a regular REPL or a notebook, you can end up with a lot of abandoned ops in your graph. Every time you re-run a notebook cell that defines any graph ops, you aren't just redefining ops—you're creating new ones.

Often it's okay to have a few extra ops floating around when you're experimenting. But things can get out of hand.

```python
for _ in range(1e6):
    x = x + 1
```

If `x` is a NumPy array, or just a regular Python number, this will run in constant memory and finish with one value for x.

But if `x` is a TensorFlow variable, there will be over a million ops in your TensorFlow graph, just defining a computation and not even _doing_ it.

One immediate fix for TensorFlow is to use a `tf.assign` op, which gives behavior more like what you might expect.

```python
increment_x = tf.assign(x, x + 1)
for _ in range(1e6):
    session.run(increment_x)
```

This revised version does not create any ops inside the loop, which is generally good advice. TensorFlow does have [control flow constructs](https://www.tensorflow.org/api_guides/python/control_flow_ops) including [while loops](https://www.tensorflow.org/api_docs/python/tf/while_loop). But only use these when really needed.

Be conscious of when you're creating ops, and only create the ones you need. Try to keep op creation distinct from op execution. And after interactive experimentation, eventually get to a state, probably in a script, where you're only creating the ops that you need.


## Avoid constants in the graph

A particularly unfortunate op to needlessly add to a graph is accidental constant ops, especially large ones.

```python
>>> many_ones = np.ones((1000, 1000))
```

There are a million ones in the NumPy array `many_ones`. We can add them up.

```python
>>> many_ones.sum()
## 1000000.0
```

What if we add them up with TensorFlow?

```python
>>> session.run(tf.reduce_sum(many_ones))
## 1000000.0
```

The result is the same, but the mechanism is quite different. This not only added some ops to the graph—it put a copy of the entire million-element array into the graph as a constant.

Variations on this pattern can result in accidentally loading an entire data set into the graph as constants. A program might still run, for small data sets. Or your system might fail.

One simple way to avoid storing data in the graph is to use the `feed_dict` mechanism.

```python
>>> many_things = tf.placeholder(tf.float64)
>>> adder = tf.reduce_sum(many_things)
>>> session.run(adder, feed_dict={many_things: many_ones})
## 1000000.0
```

As before, be clear about what you're adding to the graph and when. Concrete data usually only enters the graph at moments of evaluation.


## TensorFlow as Functional Programming

TensorFlow ops are like functions. This is especially clear when an op has one or more placeholder inputs; evaluating the op in a session is like calling a function with those arguments. So Python functions that return TensorFlow ops are like [higher-order functions](https://en.wikipedia.org/wiki/Higher-order_function).

You might decide that it's worth putting a constant into the graph. For example, if you have to reshape a lot of tensors to 28x28, you might make an op that does that.

```python
>>> input_tensor = tf.placeholder(tf.float32)
>>> reshape_to_28 = tf.reshape(input_tensor, shape=[28, 28])
```

This is like [currying](https://en.wikipedia.org/wiki/Currying) in that the `shape` argument has now been set. The `[28, 28]` has become a constant in the graph and specified that argument. Now to evaluate `reshape_to_28` we only have to provide `input_tensor`.

Broader connections have been suggested between [neural networks, types, and functional programming](http://colah.github.io/posts/2015-09-NN-Types-FP/). It's interesting to think of TensorFlow as a system that supports this kind of construction.


---

I'm working on [Building TensorFlow systems from components](http://conferences.oreilly.com/oscon/oscon-tx/public/schedule/detail/57823), a workshop at [OSCON 2017](https://conferences.oreilly.com/oscon/oscon-tx).
