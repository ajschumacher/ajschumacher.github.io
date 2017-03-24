# The TensorFlow Coordinator for Python Threading

A lot of Python code doesn't bother with [threads](https://en.wikipedia.org/wiki/Thread_(computing)) at all, but TensorFlow [encourages](https://www.tensorflow.org/programmers_guide/threading_and_queues) using threads, especially for loading data.

Threading as TensorFlow recommends still uses the standard Python [threading](https://docs.python.org/3/library/threading.html) library, but TensorFlow adds a [Coordinator](https://www.tensorflow.org/api_docs/python/tf/train/Coordinator) class that makes some good practices easier and fits with the rest of TensorFlow.

This `Coordinator` is for within-process thread coordination on one machine. It doesn't touch the TensorFlow computation graph or "coordinate" across multiple machines.

The three scripts below show how TensorFlow's `Coordinator` functionality relates to standard Python functionality.

---

### Script [1](code/base.py): Python standard library

Four threads are going to run the function `sleep_politely`. The main script will sleep for five seconds and then ask that all the threads stop, by setting `SHOULD_STOP` to `True`. The script then waits for the threads to stop, with `thread.join()`, before finishing.

```python
def sleep_politely(should_stop):
    while not should_stop():
        time.sleep(2)

SHOULD_STOP = False
should_stop = lambda: SHOULD_STOP
threads = [threading.Thread(target=sleep_politely, args=(should_stop,))
           for _ in range(4)]

for thread in threads:
    thread.start()
time.sleep(5)
SHOULD_STOP = True
for thread in threads:
    thread.join()
```

This could be set up to allow requesting stoppage inside `sleep_politely`, but the setup here parallels the TensorFlow example that comes next.

---

### Script [2](code/tf.py): with TensorFlow Coordinator

This script behaves just as the above, but uses `tf.train.Coordinator`.

```python
def sleep_politely(coord):
    while not coord.should_stop():
        time.sleep(2)

coord = tf.train.Coordinator()
threads = [threading.Thread(target=sleep_politely, args=(coord,))
           for _ in range(4)]

for thread in threads:
    thread.start()
time.sleep(5)
coord.request_stop()
coord.join(threads)
```

If appropriate, `coord.request_stop()` could also be called inside `sleep_politely` here.

---

Coordinating threads is not always easy, and there are some problems with both scripts above.

 * If there's an exception in the main script, the threads won't get stopped, and the program will effectively hang forever.
 * If there's an exception in any of the threads, everything else will carry on, whether it should or not.

---

### Script [3](code/tf_full.py): more complete TensorFlow

```python
def sleep_politely(coord):
    with coord.stop_on_exception():
        while not coord.should_stop():
            time.sleep(2)

coord = tf.train.Coordinator()
threads = [threading.Thread(target=sleep_politely, args=(coord,))
           for _ in range(4)]

try:
    for thread in threads:
        thread.start()
    time.sleep(5)
except Exception as exception:
    coord.request_stop(exception)
finally:
    coord.request_stop()
    coord.join(threads)
```

The `try`/`except`/`finally` here means that even if there's an exception in the main script, the threads should get shut down. We could also do the same without TensorFlow.

The addition of the `coord.stop_on_exception()` context manager in `sleep_politely` means that if there's an exception in one of the threads, this will also shut everything down appropriately and pass along the exception. This would be a little more work to implement without TensorFlow, but it could be done.

---

There are two reasons to use TensorFlow's `Coordinator`:

 * `Coordinator` makes some nice things particularly convenient.
 * `Coordinator` fits with more pieces of TensorFlow, like the [QueueRunner](https://www.tensorflow.org/programmers_guide/threading_and_queues#queuerunner).

The [Python `Coordinator` code](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/python/training/coordinator.py) is in one Python file and not super entangled with the rest of TensorFlow. For the threading convenience it provides, one could imagine extracting it for use elsewhere. The TensorFlow project seems to like the functionality well enough that it's one of the few components of `tf.training` that appears in both a Python and [C++ version](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/cc/training/coordinator.cc).

---

Even with the full `Coordinator` setup, the SIGINT signal (as from pressing `ctrl-c`) and the SIGTERM signal (as from `kill`) will interrupt the main script as exceptions. An additional step would be to set up [signal](https://docs.python.org/3/library/signal.html) handlers to orchestrate a more orderly shutdown for these cases, if the main script is doing anything very involved.
