# TensorFlow Logging

TensorFlow wraps the standard Python [logging library](https://docs.python.org/3/library/logging.html), exposing functionality at `tf.logging`.

This means that you can start logging things immediately after importing TensorFlow:

```python
>>> import tensorflow as tf
>>> tf.logging.info('Things are good!')
INFO:tensorflow:Things are good!
```

TensorFlow also automatically logs things using this functionality. For example, estimators will log out information about the many things they're up to.

The TensorFlow [logging code](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/python/platform/tf_logging.py) also adds some non-standard functionality. A comment notes that some of the code "is taken from pyglib/logging". I assume pyglib is a Google-internal Python library. I think it's interesting to see these Google tools [appearing here and there](/20170315-tensorflow_and_a_googleverse_like_the_hadleyverse/).

Here's an example of TensorFlow logging's added functionality: `log_every_n`.

```python
>>> tf.logging.log_every_n(tf.logging.INFO, 'Common error!', 2)
INFO:tensorflow:Common error!
>>> tf.logging.log_every_n(tf.logging.INFO, 'Common error!', 2)
>>> tf.logging.log_every_n(tf.logging.INFO, 'Common error!', 2)
INFO:tensorflow:Common error!
```

(This example won't work in an [IPython](https://ipython.org/) shell because every new REPL "read" there looks like a new file to Python.)

---

If you want to use regular Python logging techniques in addition to TensorFlow's mechanism, everything should generally work, but it is possible to get into a situation that seems surprising in a REPL.

```python
>>> import logging
>>> import tensorflow as tf
>>> logging.warn('Something interesting!')
WARNING:root:Something interesting!
>>> tf.logging.info('1+1=2')
INFO:tensorflow:1+1=2
INFO:tensorflow:1+1=2
```

This doubling is because TensorFlow's log messages are bubbling up to the root logger as intended, but both the root logger and TensorFlow's logger are getting handled in the same place, so we see the message twice.

Shortly after the initial release of TensorFlow this kind of thing [was happening more than it should](http://stackoverflow.com/questions/33662648/tensorflow-causes-logging-messages-to-double), but the current behavior is correct.

The situation shown above happens because both the base logging package and TensorFlow's logging are trying to automatically be helpful by writing things out to the interactive session.

In practice you should set up log handlers yourself, [as appropriate](http://docs.python-guide.org/en/latest/writing/logging/). And of course if you only use one or the other of `logging` or `tf.logging` you'll be particularly unlikely to have any conflicts.

A poor solution to the doubling above would be to turn off log message propagation from the TensorFlow logger.

```python
>>> tf.logging._logger.propagate = False
>>> tf.logging.info('1+1=2')
INFO:tensorflow:1+1=2
```

But I can't recommend using that as anything but a quick fix in a REPL if double messages happen to be bothering you.

---

I'm working on [Building TensorFlow systems from components](http://conferences.oreilly.com/oscon/oscon-tx/public/schedule/detail/57823), a workshop at [OSCON 2017](https://conferences.oreilly.com/oscon/oscon-tx).
