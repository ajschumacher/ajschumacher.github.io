# Reading from Disk inside the TensorFlow Graph

As I've [noted](/20170312-use_only_what_you_need_from_tensorflow/), the TensorFlow input pipeline misleadingly [described](https://www.tensorflow.org/programmers_guide/reading_data) as "reading from files" is far more complicated than many people need or want to deal with. Indeed, TensorFlow developers realize this and are [thinking about](https://github.com/tensorflow/tensorflow/issues/7951) adding alternative interfaces for getting data in to TensorFlow programs.

You can still use any method you like for loading data in Python and then put it in your TensorFlow graph via the `feed_dict` method. But say you do want to do your file reading with ops that live inside the TensorFlow graph. How does it work?

TensorFlow does have [`tf.read_file`](https://www.tensorflow.org/api_docs/python/tf/read_file) and [`tf.write_file`](https://www.tensorflow.org/api_docs/python/tf/write_file), which let you read and write whole files at once, something like regular Python `file.read()` and `file.write()`. But you likely want something a little more helpful.

In Python, you can read lines from a file like this:

```python
>>> reader = open('filename.txt'):
>>> for line in reader:
>>>    print(line)
```

TensorFlow has readers that generalize this idea of getting multiple things, like lines, from files. The immediate example is the [`tf.TextLineReader`](https://www.tensorflow.org/api_docs/python/tf/TextLineReader). There are also [readers](https://www.tensorflow.org/api_guides/python/io_ops#Readers) that read records from TFRecords files, or just fixed number of bytes at a time from arbitrary files. Reading a whole file at a time is sort of degenerate case.

Instead of taking a filename, however, TensorFlow readers take a queue of filenames. This can be useful:

 * You may have lots of files that you want to read from, possibly using multiple machines.
 * You may want to read through one or more files multiple times, for multiple epochs of training.

It's a little awkward to use a queue when you just want to read from one file, but that's how TensorFlow works.

TensorFlow's file reading gets tangled up with its threading `QueueRunner` because they're often shown together, but this is not necessary. We [can](/20170327-tensorflow_and_queues/) set up a quick and dirty one-item queue like this:

```python
>>> import tensorflow as tf
>>> filename_queue = tf.FIFOQueue(capacity=1, dtypes=[tf.string])
>>> session = tf.Session()
>>> session.run(filename_queue.enqueue('limerick.txt'))
>>> session.run(filename_queue.close())
```

We make a reader and tell it to read from files in the queue. There are two outputs that update every time you evaluate either of them:

 * A `key`, based on the current filename, which you may not need and don't need to explicitly evaluate.
 * A `value`, which is the bit of data we're probably interested in.

```python
>>> reader = tf.TextLineReader()
>>> key, value = reader.read(filename_queue)
>>> session.run([key, value])
['limerick.txt:1', 'This limerick goes in reverse']
>>> session.run([key, value])
['limerick.txt:2', "Unless I'm remiss"]
>>> session.run([key, value])
['limerick.txt:3', 'The neat thing is this:']
>>> session.run([key, value])
['limerick.txt:4', 'If you start from the bottom-most verse']
>>> session.run([key, value])
['limerick.txt:5', "This limerick's not any worse"]
>>> session.run([key, value])
# raises `OutOfRangeError`
```

The [limerick](limerick.txt) is [due to](http://www.smbc-comics.com/?id=3201) Zach Weinersmith.

If we hadn't closed the filename queue, that last `session.run` would block, waiting for somebody to add another filename to the filename queue.

If we had added more filenames to the filename queue, the reader would continue happily reading from the next, and the next.

The records here are lines of simple ASCII text, so we can immediately see them clearly in the REPL. But for many types of data you'll need a decoder.

To read CSV files, you would read text lines just as above, and then use the [`tf.decode_csv`](https://www.tensorflow.org/api_docs/python/tf/decode_csv) decoder on  `value`. The [`tf.decode_raw`](https://www.tensorflow.org/api_docs/python/tf/decode_raw) decoder turns raw bytes into standard TensorFlow datatypes. And you can parse TFRecords examples.

Boom! Reading files inside the graph!


---

I'm working on [Building TensorFlow systems from components](http://conferences.oreilly.com/oscon/oscon-tx/public/schedule/detail/57823), a workshop at [OSCON 2017](https://conferences.oreilly.com/oscon/oscon-tx).
