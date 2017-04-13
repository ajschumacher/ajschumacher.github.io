# Distributed MapReduce with TensorFlow

Using many computers to count words is a tired Hadoop example, but might be unexpected with TensorFlow. In 50 lines, a TensorFlow program can implement not only map and reduce steps, but a whole MapReduce system.

---

## Set up the cluster

The design will have three roles, or jobs. There will be one task in the `files` job, distributing units of work. There will be one task for the `reduce` role, keeping track of results. There could be arbitrarily many tasks doing the `map` job, but for this example there will be two.

TensorFlow programs often use `ps` (parameter server) and `worker` tasks, but this is largely a convention. The program here won't follow the convention.

The four tasks can run on four computers, or on fewer. To stay local, here's a cluster definition that runs them all on your local machine.

```python
cluster = {'files': ['localhost:2222'],
           'reduce': ['localhost:2223'],
           'map': ['localhost:2224', 'localhost:2225']}
```

I have a [`make_configs.py`](make_configs.py) script that produces four shell scripts ([1](config_files_0.sh), [2](config_reduce_0.sh), [3](config_map_0.sh), [4](config_map_1.sh)). Each should be sourced (like `source config_map_0.sh`) in a separate shell. This setting of environment variables is work that could be handled by a cluster manager like [Kubernetes](https://kubernetes.io/), but these scripts will get it done.

Every task will run [`count.py`](count.py). The first few lines establish the cluster.

```python
import tensorflow as tf

config = tf.contrib.learn.RunConfig()
server = tf.train.Server(config.cluster_spec,
                         job_name=config.task_type,
                         task_index=config.task_id)
session = tf.Session(server.target)
```

For more on TensorFlow clusters, see [TensorFlow Clusters: Questions and Code](/20170410-tensorflow_clusters_questions_and_code/).

To avoid lots of indentation, I'm not using `tf.Session` as a context manager, which is fine for this example. I'll similarly avoid `with` blocks when reading files later.

---

## Set up the data

For distributed data processing to make sense, you likely want a distributed file system like HDFS providing a way for workers to grab chunks of data to work on. You might have hundred-megabyte [TFRecords files](/20170323-tfrecords_for_humans/) prepared, for example.

For this example, we'll use [a dataset of 22 small text files](/20170331-on_tyranny/). We'll generate a [list of filenames](filenames.txt). Then, assuming every member of the cluster can access the file system, we can give a worker a filename and have it read the file.

```bash
$ wget http://planspace.org/20170331-on_tyranny/on_tyranny.tar.gz
$ tar zxvf on_tyranny.tar.gz
$ find on_tyranny -type f > filenames.txt
```

---

## Make a filename distributor

The `files` task will host a [queue](/20170327-tensorflow_and_queues/) of filenames.

```python
with tf.device('/job:files/task:0'):
    filename_queue = tf.FIFOQueue(capacity=10, dtypes=[tf.string],
                                  shared_name='filename_queue')
```

This code will be executed by every member of the cluster, but it won't make multiple queues. The `tf.device` context specifies that the queue lives on the `files` task machine, and the `shared_name` uniquely identifies this queue. So just one queue gets made, but every member of the cluster can refer to it with the Python variable name `filename_queue`.

The next part of the code only runs on the `files` task:

```python
if config.task_type == 'files':
    filename_to_enqueue = tf.placeholder(tf.string)
    enqueue_filename = filename_queue.enqueue(filename_to_enqueue)
    close_filename_queue = filename_queue.close()
    for line in open('filenames.txt'):
        filename = line.strip()
        session.run(enqueue_filename,
                    feed_dict={filename_to_enqueue: filename})
    session.run(close_filename_queue)
    server.join()
```

Device assignment here is left up to TensorFlow, which is fine.

The `file` task uses normal Python file reading to get filenames from [`filenames.txt`](filenames.txt) and put them in the queue.

I'm loading the queue explicitly to avoid getting into `Coordinator` and `QueueRunner`; you could also use a `string_input_producer`, for example.

Then the `files` task runs `server.join()`, which keeps it running so that the queue doesn't disappear. We'll have to kill the process eventually because it won't know when to stop. This is another thing a cluster manager could be responsible for.

---

## Make a reduce node

There's just going to be one variable storing the total word count.

```python
with tf.device('/job:reduce/task:0'):
    total_word_count = tf.Variable(0, name='total')
```

Like the code defining the queue, every task in the cluster will run this code, so every task in the cluster can refer to this variable. Variables in specific places are "de-duplicated" using `name` instead of `shared_name`.

There's very little code that only the `reduce` task runs.

```python
if config.task_type == 'reduce':
    initializer = tf.global_variables_initializer()
    session.run(initializer)
    while True:
        total_word_count_now = session.run(total_word_count)
        print('{} words so far'.format(total_word_count_now))
        time.sleep(2)
```

The `reduce` task initializes and then displays the current value of `total_word_count` every two seconds.

It would be a bit more like Hadoop MapReduce to have the reducer explicitly receive data emitted from mappers, perhaps via another queue. Then the reducer would have to run some code to reduce down data from that queue.

The absence of any reducing code in the `reduce` task demonstrates the way distribution works in TensorFlow. The `reduce` task owns a variable, but we can add to that variable from another machine.

Like the `files` task, the `reduce` task doesn't have any way of knowing when the counting process is done and then shutting down, which I think is okay for this example.

---

## Make map nodes

The `map` task has already run code establishing the filename queue and the total word count variable. Here's what each `map` task does:

```python
if config.task_type == 'map':
    filename_from_queue = filename_queue.dequeue()
    word_count_to_add = tf.placeholder(tf.int32)
    add_to_total = tf.assign_add(total_word_count,
                                 word_count_to_add,
                                 use_locking=True)
    while True:
        filename = session.run(filename_from_queue)
        text = open(filename).read()
        this_word_count = len(text.split())
        time.sleep(5)
        print('{} words in {}'.format(this_word_count, filename))
        session.run(add_to_total,
                    feed_dict={word_count_to_add: this_word_count})
```

Each `map` task pulls a filename from the queue, reads the file, counts its words, and then adds its count to the total.

A `map` task will run until the queue is empty, and then it will die with an `OutOfRangeError`. This would be a little more careful:

```python
        try:
            filename = session.run(filename_from_queue)
        except tf.errors.OutOfRangeError:
            break
```

Inside the `map` task, the actual work that's done is not part of the TensorFlow graph. We can execute arbitrary Python here.

There's a five second pause in the loop so that things don't happen too fast to watch.

The total word count is stored off in the `reduce` task, possibly on a different computer, but that doesn't matter. This is part of what's cool about TensorFlow.

---

## Run

To execute, we run [`count.py`](count.py) in four places with the appropriate environment variables set. That's it. We've counted words with many computers.

---

## So what?

Programming a cluster with TensorFlow is just like programming a single computer with TensorFlow. This is pretty neat, and it makes a lot of things possible beyond just distributed stochastic gradient descent.

The example above demonstrates a distributed queue. If you can do that, do you need a separate queueing system like [RabbitMQ](https://www.rabbitmq.com/)? Maybe not in every situation.

The example above sends filenames to workers, which is a pretty general model. What if you feel comfortable sending executable filenames, or some representation of code? You might implement something like [Celery](http://www.celeryproject.org/) pretty quickly.

The example I've shown can probably fail in more ways than I even realize. It would be more work to make it robust. It would be again more work to make it more general. But it's pretty exciting to be able to write something like this at all.

And while even the typical TensorFlow distributed training is itself a kind of MapReduce process, TensorFlow is general enough that it could be used for wildly different architectures. TensorFlow is an amazing tool.

---

## Code

Here's [`make_configs.py`](make_configs.py):

```python
import json

cluster = {'files': ['localhost:2222'],
           'reduce': ['localhost:2223'],
           'map': ['localhost:2224', 'localhost:2225']}
for task_type, addresses in cluster.items():
    for index in range(len(addresses)):
        tf_config = {'cluster': cluster,
                     'task': {'type': task_type,
                              'index': index}}
        tf_config_string = json.dumps(tf_config, indent=2)
        with open('config_{}_{}.sh'.format(task_type, index), 'w') as f:
            f.write("export TF_CONFIG='{}'\n".format(tf_config_string))
            # GPUs won't be needed, so prevent accessing GPU memory.
            f.write('export CUDA_VISIBLE_DEVICES=-1\n')
```

The files produced by [`make_configs.py`](make_configs.py) ([1](config_files_0.sh), [2](config_reduce_0.sh), [3](config_map_0.sh), [4](config_map_1.sh)) look like this:

```json
export TF_CONFIG='{
  "cluster": {
    "files": [
      "localhost:2222"
    ], 
    "map": [
      "localhost:2224", 
      "localhost:2225"
    ], 
    "reduce": [
      "localhost:2223"
    ]
  }, 
  "task": {
    "index": 0, 
    "type": "map"
  }
}'
export CUDA_VISIBLE_DEVICES=-1
```

And here's [`count.py`](count.py) all together:

```python
from __future__ import print_function

import time
import tensorflow as tf

config = tf.contrib.learn.RunConfig()
server = tf.train.Server(config.cluster_spec,
                         job_name=config.task_type,
                         task_index=config.task_id)
session = tf.Session(server.target)

with tf.device('/job:files/task:0'):
    filename_queue = tf.FIFOQueue(capacity=10, dtypes=[tf.string],
                                  shared_name='filename_queue')

if config.task_type == 'files':
    filename_to_enqueue = tf.placeholder(tf.string)
    enqueue_filename = filename_queue.enqueue(filename_to_enqueue)
    close_filename_queue = filename_queue.close()
    for line in open('filenames.txt'):
        filename = line.strip()
        session.run(enqueue_filename,
                    feed_dict={filename_to_enqueue: filename})
    session.run(close_filename_queue)
    server.join()

with tf.device('/job:reduce/task:0'):
    total_word_count = tf.Variable(0, name='total')

if config.task_type == 'reduce':
    initializer = tf.global_variables_initializer()
    session.run(initializer)
    while True:
        total_word_count_now = session.run(total_word_count)
        print('{} words so far'.format(total_word_count_now))
        time.sleep(2)

if config.task_type == 'map':
    filename_from_queue = filename_queue.dequeue()
    word_count_to_add = tf.placeholder(tf.int32)
    add_to_total = tf.assign(total_word_count,
                             total_word_count + word_count_to_add)
    while True:
        filename = session.run(filename_from_queue)
        text = open(filename).read()
        this_word_count = len(text.split())
        time.sleep(5)
        print('{} words in {}'.format(this_word_count, filename))
        session.run(add_to_total,
                    feed_dict={word_count_to_add: this_word_count})
```

All the files needed to demo this are together in a [repo on GitHub](https://github.com/ajschumacher/mapreduce_with_tensorflow).


---

I'm working on [Building TensorFlow systems from components](http://conferences.oreilly.com/oscon/oscon-tx/public/schedule/detail/57823), a workshop at [OSCON 2017](https://conferences.oreilly.com/oscon/oscon-tx).
