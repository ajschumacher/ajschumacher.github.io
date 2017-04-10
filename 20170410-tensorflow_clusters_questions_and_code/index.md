# TensorFlow Clusters: Questions and Code

One way to think about TensorFlow is as a framework for [distributed computing](https://en.wikipedia.org/wiki/Distributed_computing). I've suggested that TensorFlow is a [distributed virtual machine](/20170328-tensorflow_as_a_distributed_virtual_machine/). As such, it offers a lot of flexibility. TensorFlow also suggests some conventions that make writing programs for distributed computation tractable.


## When is there a cluster?

A [Hadoop](http://hadoop.apache.org/) or [Spark](http://spark.apache.org/) cluster is generally long-lived. The cluster runs, processing jobs as they come to it. A company might have a thousand-node Spark cluster, for example, used by everyone in a division.

In contrast, TensorFlow clusters generally spring into being for the purpose of running a particular TensorFlow program. There are computers on the network, and they become members of TensorFlow clusters based on what they're running.

To make this process manageable, you might use a system like [Kubernetes](https://kubernetes.io/) or [Google Cloud ML](https://cloud.google.com/ml-engine/) to intelligently run TensorFlow programs on specific machines in a larger pool.


## What does the cluster do for me?

In systems like Hadoop MapReduce and Spark, there's usually considerable distance between the programming interface and how the computation actually gets distributed. If you're writing your own map and reduce steps for Hadoop, you're close to that mechanism, but you're still plugging in to the pre-built larger architecture. Most users prefer higher-level APIs like [Pig](https://pig.apache.org/) on Hadoop or the standard Spark APIs. And both Hadoop and Spark support at least one SQL-style interface, even farther from the underlying implementations. As a user of Hadoop or Spark, you don't think about putting computation on particular machines, or worry about the different roles that different machines might play.

With TensorFlow, the abstraction for distributed computing is the same as the abstraction for local computing: the computation graph. Distributing TensorFlow programs means having graphs that span multiple computers. You're responsible for what parts of the graph go where, and what every computer in the cluster does.


## How many programs do I write?

One familiar model of distributed computing is client-server, like the web. Web servers and browsers are quite different programs.

Closer to TensorFlow applications, a central server could do some computation on request, or it could offer data to be processed on the client side, like [SETI@home](https://setiathome.berkeley.edu/) or [Folding@home](https://folding.stanford.edu/). Again, server and client code are distinct.

Nothing prevents you from writing separate "server" and "client" TensorFlow programs, but it isn't necessary, natural, or recommended. One of TensorFlow's design goals was to get away from the client-server divide in DistBelief.

The TensorFlow distributed runtime is peer-to-peer: every machine can accept graph nodes from any other machine, and every machine can put graph nodes on any other machine. Generally, every machine will run the same program. Whether the system behaves like a client-server system or something else entirely is up to you.


## Which computer does what?

Distributed TensorFlow works by running the same program on multiple machines, but that doesn't mean that every machine does exactly the same thing.

If a system with separate client and server programs is like a system of two symbiotic species, your TensorFlow program is like the DNA of an organism whose cells specialize based on their environment.

The dominant convention is to have two main roles: _parameter servers_ (`ps`) and _workers_. You might also have a _master_ role, and one of your workers can be the _chief_ worker, but `ps` and `worker` is usually the main division.

Usually a machine running your TensorFlow program will learn what its role should be based on the `TF_CONFIG` environment variable, which should be set by your cluster manager.


## Who knows what about the cluster topology?

In Hadoop and Spark, the system is keeping track of all the machines in the cluster. On the web, servers generally only know about client addresses long enough to provide a response.

Usually every machine in a TensorFlow cluster will be given a complete listing of machines in the cluster.

If some machines really don't need to know about others in the same cluster, for example if workers never communicate with one another, it's also possible to provide less complete information.

The cluster topology is also most often provided via the `TF_CONFIG` environment variable.


## Code?

Let's say you have a network which includes the following machines:

 * `192.168.0.10`
 * `192.168.0.11`
 * `192.168.0.12`

The machines are all running the same version of TensorFlow. Let's see how we could get them set up to run a distributed TensorFlow program.

We'll have one parameter server (`ps`) and two workers. Each machine will know about the cluster's topology.

```python
import tensorflow as tf

cluster = {'ps': ['192.168.0.10:2222'],
           'worker': ['192.168.0.11:2222', '192.168.0.12:2222']}
cluster_spec = tf.train.ClusterSpec(cluster)
server = tf.train.Server(cluster_spec)
```

In the strings like `'192.168.0.10:2222'`, the protocol (gRPC) is omitted, and the port (`2222`) is the default for TensorFlow communication.

The `server` that every machine starts is what enables the communication of the TensorFlow distributed runtime; its behavior is largely at a lower level than the code we'll write.

This code gets the network topology going, but it doesn't tell an individual machine which role it should have. Working out which IP address or hostname refers to the current machine is not necessarily straightforward, but hard-coding different values into different copies of the code would be an even worse idea than hard-coding the topology once. This is where the environment variable `TF_CONFIG` becomes very useful.

We'll put cluster and task information into the `TF_CONFIG` environment variable as a JSON serialization. On the machine that will be our parameter server, the data will look like this as a Python dictionary:

```python
tf_config = {'cluster': {'ps': ['192.168.0.10:2222'],
                         'worker': ['192.168.0.11:2222', '192.168.0.12:2222']},
             'task': {'type': 'ps',
                      'index': 0}}
```

You can set the environment variable in the usual way in a shell, making small changes to achieve JSON syntax.

```bash
$ export TF_CONFIG='{"cluster": {"ps": ["192.168.0.10:2222"], "worker": ["192.168.0.11:2222", "192.168.0.12:2222"]}, "task": {"type": "ps", "index": 0}}'
```

To avoid fussing with that directly, you could do it in Python.

```python
import os
import json

os.environ['TF_CONFIG'] = json.dumps(tf_config)
```

Really, it'll be best if your cluster manager sets `TF_CONFIG` for you.

Once `TF_CONFIG` is set, you can read it and get to work.

```python
tf_config = json.loads(os.environ['TF_CONFIG'])
cluster_spec = tf.train.ClusterSpec(tf_config['cluster'])
task_type = tf_config['task']['type']
task_id = tf_config['task']['index']
server = tf.train.Server(cluster_spec,
                         job_name=task_type,
                         task_index=task_id)
```

Another way to do that is with `tf.contrib.learn.RunConfig`, which automatically checks the `TF_CONFIG` environment variable.

```python
config = tf.contrib.learn.RunConfig()
server = tf.train.Server(config.cluster_spec,
                         job_name=config.task_type,
                         task_index=config.task_id)
```

At this point, you are ready to begin writing a distributed TensorFlow program.
