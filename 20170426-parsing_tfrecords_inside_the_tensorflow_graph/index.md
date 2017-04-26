# Parsing TFRecords inside the TensorFlow Graph

You can parse TFRecords using the standard protocol buffer `.FromString` method, but you can also parse them inside the TensorFlow graph.

The examples here assume you have in memory the serialized Example `my_example_str` and SequenceExample `my_seq_ex_str` from [TFRecords for Humans](/20170323-tfrecords_for_humans/). You could create them, or read them from [my_example.tfrecords](/20170323-tfrecords_for_humans/my_example.tfrecords) and [my_seq_ex.tfrecords](/20170323-tfrecords_for_humans/my_seq_ex.tfrecords). That loading could be via `tf.python_io.tf_record_iterator` or via `tf.TFRecordReader` following the pattern shown in [Reading from Disk inside the TensorFlow Graph](/20170412-reading_from_disk_inside_the_tensorflow_graph/).

The [`tf.parse_single_example`](https://www.tensorflow.org/api_docs/python/tf/parse_single_example) decoder works like `tf.decode_csv`: it takes a string of raw data and turns it into structured data, based on the options it's created with. The structured data it turns it into is _not_ a protocol buffer message object, but a dictionary that is hopefully easier to work with.

```python
import tensorflow as tf

serialized = tf.placeholder(tf.string)

my_example_features = {'my_ints': tf.FixedLenFeature(shape=[2], dtype=tf.int64),
                       'my_float': tf.FixedLenFeature(shape=[], dtype=tf.float32),
                       'my_bytes': tf.FixedLenFeature(shape=[1], dtype=tf.string)}
my_example = tf.parse_single_example(serialized, features=my_example_features)

session = tf.Session()

session.run(my_example, feed_dict={serialized: my_example_str})
## {'my_ints': array([5, 6]),
##  'my_float': 2.7,
##  'my_bytes': array(['data'], dtype=object)}
```

The `shape` parameter is part of the schema we're defining. A `shape` of `[]` means a single element, so the result returned won't be in an array, as for `my_float`. The `shape` of `[1]` means an array containing one element, like for `my_bytes`. Within a Feature, things are always listed, so the choice of how to get a single element back out is decided by the choice of `shape` argument. A `shape` of `[2]` means a list of two elements, naturally enough, and there's no alternative.

The `dtype=object` is how NumPy works with strings.

When some feature might have differing numbers of values across records, they can all be read with `tf.VarLenFeature`. This distinction is made only when parsing. Records are made with however many values you put in; you don't specify `FixedLen` or `VarLen` when you're making an `Example`. So the `my_ints` feature just parsed as `FixedLen` can also be parsed as `VarLen`.

```python
my_example_features = {'my_ints': tf.VarLenFeature(dtype=tf.int64),
                       'my_float': tf.FixedLenFeature(shape=[], dtype=tf.float32),
                       'my_bytes': tf.FixedLenFeature(shape=[1], dtype=tf.string)}
my_example = tf.parse_single_example(serialized, features=my_example_features)

session.run(my_example, feed_dict={serialized: my_example_str})
## {'my_ints': SparseTensorValue(indices=array([[0], [1]]),
##                               values=array([5, 6]),
##                               dense_shape=array([2])),
##  'my_float': 2.7,
##  'my_bytes': array(['data'], dtype=object)}
```

When parsing as a `VarLenFeature`, the result is a sparse representation. This can seem a little silly, because features here will always be dense from left to right. Early versions of TensorFlow [didn't](https://github.com/tensorflow/tensorflow/issues/976) have the current behavior. But this sparseness is a mechanism by which TensorFlow can support non-rectangular data, for example when forming batches from multiple variable length features, or as seen next with a `SequenceExample`:

```python
my_context_features = {'my_bytes': tf.FixedLenFeature(shape=[1], dtype=tf.string)}
my_sequence_features = {'my_ints': tf.VarLenFeature(shape=[2], dtype=tf.int64)}
my_seq_ex = tf.parse_single_sequence_example(
                serialized,
                context_features=my_context_features,
                sequence_features=my_sequence_features)

result = session.run(my_seq_ex, feed_dict={serialized: my_seq_ex_str})
result
## ({'my_bytes': array(['data'], dtype=object)},
##  {'my_ints': SparseTensorValue(
##                  indices=array([[0, 0], [0, 1], [1, 0], [1, 1], [1, 2]]),
##                  values=array([5, 6, 7, 8, 9]),
##                  dense_shape=array([2, 3]))})
```

The result is a tuple of two dicts: the context data and the sequence data.

Since the `my_ints` sequence feature is parsed as a `VarLenFeature`, it's returned as a sparse tensor. This example has to be parsed as a `VarLenFeature`, because the two entries in `my_ints` are of different lengths (`[5, 6]` and `[7, 8, 9]`).

The way the `my_ints` values get combined into one sparse tensor is the same as the way it would be done when making a batch from multiple records each containing a `VarLenFeature`.

To make it clearer what's going on, we can look at the sparse tensor in dense form:

```python
session.run(tf.sparse_tensor_to_dense(result[1]['my_ints']))
## array([[5, 6, 0],
##        [7, 8, 9]])
```

The other option for parsing sequence features is `tf.FixedLenSequenceFeature`, which will work if each entry of the sequence feature is the same length. The result then is a dense tensor.

To parse multiple `Example` records in one op, there's [`tf.parse_example`](https://www.tensorflow.org/versions/master/api_docs/python/tf/parse_example). This returns a dict with the same keys you'd get from parsing a single `Example`, with the values combining the values from all the parsed examples, in a batch-like fashion. There isn't a corresponding op for `SequenceExample` records.

More could be said about sparse tensors and TFRecords. The [tf.sparse_merge](https://www.tensorflow.org/api_docs/python/tf/sparse_merge) op is one way to combine sparse tensors, similar to the combination that happened for `my_ints` in the `SequenceExample` above. And there's [`tf.SparseFeature`](https://www.tensorflow.org/api_docs/python/tf/SparseFeature) for parsing out general sparse features directly from TFRecords (better documentation in [source](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/python/ops/parsing_ops.py)).


---

I'm working on [Building TensorFlow systems from components](http://conferences.oreilly.com/oscon/oscon-tx/public/schedule/detail/57823), a workshop at [OSCON 2017](https://conferences.oreilly.com/oscon/oscon-tx).
