# `mystery.tfrecords`

Here's a practical puzzle: what's in the file [`mystery.tfrecords`](mystery.tfrecords)?

---

You don't need any more extra information specific to that file. Here are a few posts about the format and related issues, some of which might be helpful:

 * [TFRecords for Humans](/20170323-tfrecords_for_humans/)
 * [TFRecords via Protocol Buffer Definitions](/20170330-tfrecords_via_proto/)
 * [Images and TFRecords](/20170403-images_and_tfrecords/)
 * [Reading from Disk inside the TensorFlow Graph](/20170412-reading_from_disk_inside_the_tensorflow_graph/)

<!--

Welcome to hidden additional notes! Finding this is a way of solving
the puzzle, I suppose...

Here's how `mystery.tfrecords` was made:

```python
import tensorflow as tf

with open('success.jpg') as f:
    success = f.read()

example = tf.train.Example(features=tf.train.Features(feature={
    'jpg': tf.train.Feature(bytes_list=tf.train.BytesList(value=[success]))
}))

example_str = example.SerializeToString()

with tf.python_io.TFRecordWriter('mystery.tfrecords') as writer:
    writer.write(example_str)
```

Here's one way to get the contents back out:

```python
reader = tf.python_io.tf_record_iterator('mystery.tfrecords')

examples = [tf.train.Example().FromString(example_str)
            for example_str in reader]
# Using `SequenceExample` rather than `Example` also works.

len(examples)  # 1
# So we know there's just one example in there.

example = examples[0]

example.features.feature.keys()  # 'jpg'
# If parsed as a SequenceExample, this would instead be:
# `example.context.feature.keys()`

# It should be clear from the 'jpg' key, but you can also check:
len(example.features.feature['jpg'].int64_list.value)  # 0
len(example.features.feature['jpg'].float_list.value)  # 0

len(example.features.feature['jpg'].bytes_list.value)  # 1

jpg = example.features.feature['jpg'].bytes_list.value[0]

# If you don't trust the key, you can check the magic number:
jpg[:2]  # '\xff\xd8'
# That's the JPG magic number, FFD8.

with open('success.jpg', 'wb') as f:
    f.write(jpg)
```

Success!

-->

---

I'm working on [Building TensorFlow systems from components](http://conferences.oreilly.com/oscon/oscon-tx/public/schedule/detail/57823), a workshop at [OSCON 2017](https://conferences.oreilly.com/oscon/oscon-tx).
