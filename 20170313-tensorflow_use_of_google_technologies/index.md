# TensorFlow use of Google Technologies

TensorFlow is a large project. It has a lot of unique features, and as a Google project it also pulls in other Google projects: gflags, Bazel, protobuf, gRPC, and gemmlowp. To better understand and use TensorFlow, it helps to know what these pieces are and how they fit together.

---

### gflags

The system TensorFlow users are most likely to encounter in their code is gflags. Formerly Google Commandline Flags, gflags is a Google system for building standard [command-line interfaces](https://en.wikipedia.org/wiki/Command-line_interface).

There's a [C++ implementation](https://github.com/gflags/gflags), which has [a documentation page](https://gflags.github.io/gflags/) reminiscent of a command-line interface. The [Python gflags](https://github.com/google/python-gflags) is documented primarily via a collection of [examples](https://github.com/google/python-gflags/tree/master/examples).

Python users may be more familiar with the Python standard library's [argparse](https://docs.python.org/3/library/argparse.html) or perhaps the older [optparse](https://docs.python.org/2/library/optparse.html), which both achieve functionality similar to that of gflags.

In TensorFlow, gflags appears when you see, for example, `tf.app.flags.FLAGS` or `tf.app.run()` ([example code](https://github.com/GoogleCloudPlatform/cloudml-samples/blob/master/mnist/trainable/trainer/task.py)).

---

### Bazel

[Bazel](https://bazel.build/) is a build tool like [make](https://www.gnu.org/software/make/). Bazel is [open source](https://github.com/bazelbuild/bazel); [originally](https://en.wikipedia.org/wiki/Bazel_(software)) there was Google's internal "Blaze" tool.

You might encounter Bazel if you're building TensorFlow from source, for example.

![bazel](img/bazel.png)

---

### protobuf

[Protocol buffers](https://developers.google.com/protocol-buffers/) (often protobuf, or just proto) "are Google's [[open source](https://github.com/google/protobuf)] language-neutral, platform-neutral, extensible mechanism for serializing structured data – think XML, but smaller, faster, and simpler."

When you look at protocol buffers in their text representations, they look something like [JSON](http://www.json.org/).

You likely won't encounter protocol buffers directly when using TensorFlow. They're used under the hood all over the place: for example, as the format for [TensorBoard](https://www.tensorflow.org/get_started/summaries_and_tensorboard) summaries, and to help make data transfer efficient in distributed settings.

---

### gRPC

[gRPC](http://www.grpc.io/) is Google's [open source](https://github.com/grpc/grpc) framework for [remote procedure call (RPC)](https://en.wikipedia.org/wiki/Remote_procedure_call) systems. It uses protocol buffers.

If RPC is unfamiliar, there is some comparison to [RESTful](https://en.wikipedia.org/wiki/Representational_state_transfer) communications for web services.

You might encounter gRPC if you build a client for a [TensorFlow serving](https://tensorflow.github.io/serving/) server, for example.

![gRPC](img/grpc.svg)

---

### gemmlowp

[gemmlowp](https://github.com/google/gemmlowp) is Google's open source low-precision matrix multiplication library.

You won't likely encounter gemmlowp directly, but you'll benefit from it if you're using TensorFlow for [low-precision](https://github.com/google/gemmlowp/blob/master/doc/low-precision.md) implementations.

---

Thanks to Googlers [Julia Ferraioli](https://twitter.com/juliaferraioli), [Pete Warden](https://twitter.com/petewarden), and [Martin Wicke](https://twitter.com/martin_wicke), for a brief [twitter exchange](https://twitter.com/petewarden/status/841062427202527232) that informed this list.

I'm working on [Building TensorFlow systems from components](http://conferences.oreilly.com/oscon/oscon-tx/public/schedule/detail/57823), a workshop at [OSCON 2017](https://conferences.oreilly.com/oscon/oscon-tx).
