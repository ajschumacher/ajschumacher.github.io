# TFRecords for Humans

TensorFlow [recommends](https://www.tensorflow.org/programmers_guide/reading_data#standard_tensorflow_format) its TFRecords format as the standard TensorFlow format for data on disk.

You [don't have to](/20170312-use_only_what_you_need_from_tensorflow/) use TFRecords with TensorFlow. But if you need to read data inside your TensorFlow graph, and a reader op doesn't exist for your data, it might be easier to transform your data to TFRecords than to write a [custom data reader op](https://www.tensorflow.org/extend/new_data_formats).

Before using TFRecords in a distributed setting, you probably want to understand and work with them locally.

---

### The TFRecords Format

TFRecords is a [simple binary file format](https://www.tensorflow.org/api_guides/python/python_io#TFRecords_Format_Details). It lets you put one or more strings of bytes into a file. You could put any bytes you like in a TFRecords file, but it'll be more useful to use the formats provided in TensorFlow.

TensorFlow defines two [protocol buffer](https://developers.google.com/protocol-buffers/) message types for use with TFRecords: the [Example](https://www.tensorflow.org/api_docs/python/tf/train/Example) message type and the [SequenceExample](https://www.tensorflow.org/api_docs/python/tf/train/SequenceExample) message type.

The pre-defined protocol buffer message types offer flexibility by letting you arrange your data as a map from string keys to values that are lists of integers, lists of 32-bit floats, or lists of bytes.

---

### Writing and Reading in the style of `Example` Records without TensorFlow

An equivalent representation of an `Example` TFRecord using Python dictionaries might look like this:

```python
my_dict = {'features' : {
    'my_ints': [5, 6],
    'my_float': [2.7],
    'my_bytes': 'data'
}}
```

In Python 2, the string literal `'data'` is bytes. The equivalent in Python 3 is `bytes('data', 'utf-8')`. And Python uses 64-bit floats rather than the 32-bit floats that TFRecords uses, so we have more precision in Python.

The values in this `dict` are accessed like this:

 * `my_dict['features']['my_ints']`
 * `my_dict['features']['my_float']`
 * `my_dict['features']['my_bytes']`

Ordinarily, to save this data (serialize and write to disk) and then read it again (read from disk and deserialize) in Python you might use the [pickle](https://docs.python.org/3/library/pickle.html) module. For example:

```python
import pickle

my_dict_str = pickle.dumps(my_dict)
with open('my_dict.pkl', 'w') as f:
    f.write(my_dict_str)

with open('my_dict.pkl', 'r') as f:
    that_dict_str = f.read()
that_dict = pickle.loads(that_dict_str)
```

---

### Writing and Reading `Example` Records with TensorFlow

The TFRecords `Example` format defines things in detail: An `Example` contains one `Features`, which is a map from strings to `Feature` elements, which can each be `Int64List`, `FloatList`, or `BytesList`. (See also: [example.proto](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/core/example/example.proto) and [feature.proto](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/core/example/feature.proto))

```python
import tensorflow as tf

my_example = tf.train.Example(features=tf.train.Features(feature={
    'my_ints': tf.train.Feature(int64_list=tf.train.Int64List(value=[5, 6])),
    'my_float': tf.train.Feature(float_list=tf.train.FloatList(value=[2.7])),
    'my_bytes': tf.train.Feature(bytes_list=tf.train.BytesList(value='data'))
}))
```

The values in the `Example` can be accessed then like this:

 * `my_example.features.feature['my_ints'].int64_list.value`
 * `my_example.features.feature['my_float'].float_list.value`
 * `my_example.features.feature['my_bytes'].bytes_list.value`

Writing to and reading from disk are much like with `pickle`, except that the reader here provides all the records from a TFRecords file. In this example, there's only one record in the file.

```python
my_example_str = my_example.SerializeToString()
with tf.python_io.TFRecordWriter('my_example.tfrecords') as writer:
    writer.write(my_example_str)

reader = tf.python_io.tf_record_iterator('my_example.tfrecords')
those_examples = [tf.train.Example().FromString(example_str)
                  for example_str in reader]
```

---

### Images in `Example` Records

The `Example` format lets you store pretty much any kind of data, including images. But the mechanism for arranging the data into serialized bytes, and then reconstructing the original format again, is left up to you. For more on this, see my post on [Images and TFRecords](/20170403-images_and_tfrecords/).

For two more complete _in situ_ examples of converting images to TFRecords, check out [code for MNIST images](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/examples/how_tos/reading_data/convert_to_records.py) and [code for ImageNet images](https://github.com/tensorflow/models/blob/master/inception/inception/data/build_imagenet_data.py). The ImageNet code can be run on the command-line.

---

### The `SequenceExample` Record

The `SequenceExample` message type essentially extends `Example` for sequence data. (You could imagine achieving the same effect with just `Example`, but it would be awkward.)

A `SequenceExample` keeps the same kind of map as `Example`, but calls it `context`, because it's thought of as the static context for the dynamic sequence data. And it adds another map, called `feature_lists`, that maps from string keys to lists of lists.

In Python dictionaries, a `SequenceExample` is like this:

```python
my_seq_dict = {
    'context' : {
        'my_bytes':
            'data'},
    'feature_lists' : {
        'my_ints': [
            [5, 6],
            [7, 8, 9]]}}
```

A corresponding full `SequenceExample` is a bit more verbose:

```python
my_seq_ex = tf.train.SequenceExample(
    context=tf.train.Features(feature={
        'my_bytes':
            tf.train.Feature(bytes_list=tf.train.BytesList(value='data'))}),
    feature_lists=tf.train.FeatureLists(feature_list={
        'my_ints': tf.train.FeatureList(feature=[
            tf.train.Feature(int64_list=tf.train.Int64List(value=[5, 6])),
            tf.train.Feature(int64_list=tf.train.Int64List(value=[7, 8, 9]))])}))
```

You probably don't want to mix `Example` and `SequenceExample` records in the same TFRecords file.

<!--

Good look at `SequenceExample` with different way of making them...
http://www.wildml.com/2016/08/rnns-in-tensorflow-a-practical-guide-and-undocumented-features/

-->

---

### Reading TFRecords in a TensorFlow Graph

You may eventually want to read TFRecords files with ops in a TensorFlow graph, using [tf.TFRecordReader](https://www.tensorflow.org/api_docs/python/tf/TFRecordReader). This will involve a filename queue; for an example, check out [some MNIST tutorial code](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/examples/how_tos/reading_data/fully_connected_reader.py).

---

I'm working on [Building TensorFlow systems from components](http://conferences.oreilly.com/oscon/oscon-tx/public/schedule/detail/57823), a workshop at [OSCON 2017](https://conferences.oreilly.com/oscon/oscon-tx).
