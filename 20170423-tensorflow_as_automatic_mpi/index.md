# TensorFlow as Automatic MPI

TensorFlow raises the level of abstraction in distributed programs from message-passing to data structures and operations directly on those data structures. The difference is analogous to the difference between programming in [assembly](https://en.wikipedia.org/wiki/Assembly_language) and programming in a high-level language. TensorFlow may not have every possible high-performance feature for cluster computing, but what it offers is compelling.

---

## Message-Passing

Leaving aside shared filesystems or directly accessed shared memory, systems that run across multiple computers have to communicate by sending messages to one another. A low-level approach might use [TCP](https://en.wikipedia.org/wiki/Transmission_Control_Protocol) sockets directly. Some convenience could be obtained by using Remote Procedure Calls ([RPC](https://en.wikipedia.org/wiki/Remote_procedure_call)).

The Message-Passing Interface ([MPI](https://en.wikipedia.org/wiki/Message_Passing_Interface)) was created in the early 1990s to make distributed programming easier within the High Performance Computing (HPC) community. It standardized interfaces like `MPI_Send` and `MPI_Recv` to facilitate exchanging data between processes of a distributed system.

The [actor model](https://en.wikipedia.org/wiki/Actor_model) also focuses on message-passing, as for example in [Erlang](https://en.wikipedia.org/wiki/Erlang_(programming_language)) or with [Akka](http://akka.io/) in Java or Scala.

Message-passing gives you fine-grained control over how nodes communicate. You can use message-passing to build up a variety of algorithms and new systems. For example, [Spark](http://spark.apache.org/) was built in part with Akka agents for some time, before switching to an RPC-based implementation. TensorFlow also builds its own abstractions using message-passing.

---

## Automatic Message-Passing with TensorFlow

TensorFlow uses message-passing, but it's largely invisible to TensorFlow users. The TensorFlow API lets you say where data and operations should live, and TensorFlow automatically handles any necessary messaging.

Programming with explicit messages is like the low-level memory shifting necessary when programming in [assembly](https://en.wikipedia.org/wiki/Assembly_language). For example, here is some assembly pseudo-code:

```
copy value from position `a` to register 1
copy value from position `b` to register 2
add register 1 and 2
copy result to position `c`
```

In a high-level language, this could be:

```python
c = a + b
```

Similarly, with TensorFlow, you focus on the computation you want performed, and don't worry about how values may need to be moved around to make it happen. A distributed analog to the assembly above might look like this:

```
send value of `a` from machine A to machine D
send value of `b` from machine B to machine D
add values on machine D
send result to machine C
```

And with TensorFlow:

```python
c = a + b
```

At least, that's the ideal. TensorFlow may still need explicit direction on where things should be placed ([with tf.device](https://www.tensorflow.org/api_docs/python/tf/device)) especially when multiple machines are involved. But that direction is more succinct and declarative than the full imperative detail of message-passing.

---

## Faster Messages and Collective Communications

TensorFlow's user API is essentially message-less, but TensorFlow still uses messages under the hood. The contents of the messages are serialized protocol buffers sent via [gRPC](http://www.grpc.io/), which uses [HTTP/2](https://en.wikipedia.org/wiki/HTTP/2).

A message-based approach can be made faster by using a faster transport, and by using faster algorithms. TensorFlow has some early support for both, but other frameworks may offer more. You may or may not care, as the simplicity of TensorFlow's approach may or may not outweigh possible performance boosts.

One easy transport speedup could come in hardware with NVIDIA's [NVLink](http://www.nvidia.com/object/nvlink.html) interconnect, which is faster than [PCIe](https://en.wikipedia.org/wiki/PCI_Express). As far as I can tell NVLink won't require code changes, but it looks like it will be pretty rare: it may be that only some supercomputers ([Summit](https://www.olcf.ornl.gov/summit/), [Sierra](https://asc.llnl.gov/coral-info)) will use NVLink, with IBM's [POWER](https://en.wikipedia.org/wiki/IBM_POWER_microprocessors) processors.

Some clusters connect machines with [InfiniBand](https://en.wikipedia.org/wiki/InfiniBand) rather than [ethernet](https://en.wikipedia.org/wiki/Ethernet). InfiniBand Remote Direct Memory Access ([RDMA](https://en.wikipedia.org/wiki/Remote_direct_memory_access)) is supposed to be pretty fast.

Jun Shi at Yahoo contributed an [implementation](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/contrib/verbs/README.md), [merged](https://github.com/tensorflow/tensorflow/pull/8943) four days ago, that begins to let TensorFlow use RDMA for transport via IB verbs, in addition to gRPC.

MPI implementations often support InfiniBand, and an advantage of using MPI is that you can let that implementation worry about InfiniBand support without writing your own RDMA code. There's an [open pull request](https://github.com/tensorflow/tensorflow/pull/7710) to give TensorFlow this kind of MPI integration.

On the algorithm side, there are [collective communication](https://computing.llnl.gov/tutorials/mpi/#Collective_Communication_Routines) operations that can be optimized, and MPI implementations tend to be good at these. For example, [ring allreduce](http://research.baidu.com/bringing-hpc-techniques-deep-learning/) is more efficient for syncing up model parameters than sending them all to a central parameter server and then sending them all back out. Baidu has a [fork](https://github.com/baidu-research/tensorflow-allreduce) of TensorFlow that adds their [implementation](https://github.com/baidu-research/baidu-allreduce) of ring allreduce using MPI at [`tf.contrib.mpi`](https://github.com/baidu-research/tensorflow-allreduce/tree/master/tensorflow/contrib/mpi).

Outside the MPI world, the NVIDIA Collective Communications Library ([NCCL](https://devblogs.nvidia.com/parallelforall/fast-multi-gpu-collectives-nccl/)) works with multiple GPUs on the same machine. TensorFlow has some support for this via [`tf.contrib.nccl`](https://github.com/tensorflow/tensorflow/tree/master/tensorflow/contrib/nccl).

Quite distinct from TensorFlow, the Facebook Incubator project [Gloo](https://github.com/facebookincubator/gloo) focuses on collective communication algorithms and supports transport via TCP/IP and InfiniBand without MPI. Gloo is used by [Caffe2](https://caffe2.ai/); the Caffe2 example [resnet50 trainer](https://github.com/caffe2/caffe2/blob/master/caffe2/python/examples/resnet50_trainer.py) uses Gloo's ring allreduce.

<!--

Just for fun, here's an Akka implementation of allreduce that I found:
https://github.com/brianmartin/akka-allreduce
I believe that's more of a tree allreduce than a ring allreduce.

-->

---

## Single-Machine Parallelism

The HPC community has an approach called "MPI everywhere" which means running one single-threaded MPI processes per CPU core. The simplicity of writing single-threaded programs with all parallelism via MPI is attractive, but it's not necessarily the best way to use a machine with a lot of cores and possibly GPUs.

The hybrid approach is to have parallelism both across multiple machines and within each individual machine, usually via threads. HPC folks seem to like to use [OpenMP](https://en.wikipedia.org/wiki/OpenMP) for multithreading.

TensorFlow supports this kind of within-process parallelism. TensorFlow uses threads pretty freely internally, and you can add your own additional parallelism with Python's [threading](https://docs.python.org/3/library/threading.html) or [multiprocessing](https://docs.python.org/3/library/multiprocessing.html) libraries, among many possible options. Just as with MPI though, when programs are run by a cluster manager, resources may be restricted.

---

## Code organization

It isn't strictly required for either, but it seems most common to write MPI programs and distributed TensorFlow programs with one entry point that quickly specializes based on the particular role in the cluster for that node. As this implies, every invocation of the program has to know something about the cluster and its place in it.

---

## Cluster Topology

MPI implementations provide a mechanism in starting a group of processes by which every process knows how many there are in its group and its position or _rank_ in the group. The rank 0 process, called the _root_, is generally special.

TensorFlow leaves the starting of distributed processes to a cluster manager like Kubernetes. It's common to have several task groups like `ps` and `worker`, with a given process having a task type and a number within that group.

Gloo is interestingly different in that individual processes may not start with knowledge of the cluster topology, but only with a reference to a central broker which could be a file on a shared filesystem or a Redis server. Each process checks in with and gets information about other members of the cluster via the central broker. Gloo calls this process _rendezvous_. As with MPI, processes find out about just one group of processes, and in fact Gloo can use MPI for its initial rendezvous setup.

---

## See also

 * [TensorFlow as a Distributed Virtual Machine](/20170328-tensorflow_as_a_distributed_virtual_machine/)
 * [TensorFlow Clusters: Questions and Code](/20170410-tensorflow_clusters_questions_and_code/)
 * [Distributed MapReduce with TensorFlow](/20170411-distributed_mapreduce_with_tensorflow/)

---

Thanks to [Dan Fujita](https://twitter.com/danfujita123) for suggesting more connections between TensorFlow and MPI, and sharing some MPI code that was helpful. Thanks also to [Jonathan Dursi](https://twitter.com/ljdursi), whose [blog](https://www.dursi.ca/) I read with interest. And thanks to [Cliff Woolley](https://github.com/cliffwoolley) of NVIDIA for [clarifying](https://github.com/NVIDIA/nccl/issues/86) the meaning of NCCL.

I'm working on [Building TensorFlow systems from components](http://conferences.oreilly.com/oscon/oscon-tx/public/schedule/detail/57823), a workshop at [OSCON 2017](https://conferences.oreilly.com/oscon/oscon-tx).
