# Everything in the Graph? Even Glob?

Programming with TensorFlow is largely building TensorFlow graphs. It can be like using Python to write a program for another computer: the TensorFlow runtime. If you want all your computation to be in the graph, you need to be able to express everything with TensorFlow ops.

It's not necessarily bad to do work outside the TensorFlow graph. Maybe there's a package that does exactly what you need for one part of your program. It could make sense to use TensorFlow for some things, and then pull off the graph and use the other package.

Advantages of staying inside the graph might include better performance, as you aren't moving data into and out of the TensorFlow runtime's internal formats. And if you're developing in Python but want to take your graph and ship it using TensorFlow serving, or perhaps use another language, anything outside the graph will need special attention.

The desire to stay in-graph leads to lots of ops existing that you might not think are essential for a machine learning library. This includes functionality for file formats like PNG and JPEG, queues and queue management, and even the lowly `glob`.

[`glob`](https://en.wikipedia.org/wiki/Glob_(programming)) refers to patterns used for matching filenames. For example, in a shell, you might use a `glob` to list all the text files in a directory.

```bash
$ ls *.txt
## one.txt        two.txt
```

In Python, the standard library includes [`glob`](https://docs.python.org/3/library/glob.html) functionality.

```python
>>> import glob
>>> glob.glob('*.txt')
## ['one.txt', 'two.txt']
```

TensorFlow has a similar operation: [`tf.matching_files`](https://www.tensorflow.org/api_docs/python/tf/matching_files).

```python
>>> import tensorflow as tf
>>> session = tf.Session()
>>> glob = tf.matching_files('*.txt')
>>> session.run(glob)
## array(['./one.txt', './two.txt'], dtype=object)
```

TensorFlow's globbing is limited in that it doesn't support wildcards in directory names, and it doesn't support the recursive globbing found in the `glob` of Python 3.5+.

Every time a `tf.matching_files` op is evaluated, it goes and reads filenames from disk. What's often seen instead is [`tf.train.match_filenames_once`](https://www.tensorflow.org/api_docs/python/tf/train/match_filenames_once), which introduces an extra level of lazy evaluation in that it will execute `tf.matching_files` the first time it's evaluated, and then it caches the results, returning the same list of files when evaluated again even if the files on disk become different. Because this relies on a local variable for the cache ([source](https://github.com/tensorflow/tensorflow/blob/a5b1fb8e56ceda0ee2794ee05f5a7642157875c5/tensorflow/python/training/input.py#L55)) you'll have to initialize.

```python
>>> import tensorflow as tf
>>> session = tf.Session()
>>> glob = tf.train.match_filenames_once('*.txt')
>>> initializer = tf.local_variables_initializer()
>>> session.run(initializer)
>>> session.run(glob)
## array(['./one.txt', './two.txt'], dtype=object)
```

With functionality like this, TensorFlow really subsumes a lot of things that could at least in theory be handled separately. The choice of whether to put any particular piece of computation into the TensorFlow graph or not remains up to developer.

![glob](glob.png)


---

I'm working on [Building TensorFlow systems from components](http://conferences.oreilly.com/oscon/oscon-tx/public/schedule/detail/57823), a workshop at [OSCON 2017](https://conferences.oreilly.com/oscon/oscon-tx).
