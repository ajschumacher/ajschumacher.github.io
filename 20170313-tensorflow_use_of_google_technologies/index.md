# TensorFlow use of Google Technologies

TensorFlow is a large project. It has a lot of unique features, and as a Google project, it also connects with other Google projects: gflags, Bazel, protobuf, gRPC, gemmlowp, StreamExecutor, and GFile. To better understand and use TensorFlow, it helps to know what these pieces are and how they fit together.

---

### gflags

In TensorFlow code, you may see, for [example](https://github.com/GoogleCloudPlatform/cloudml-samples/blob/master/mnist/trainable/trainer/task.py), `tf.app.flags.FLAGS`. This is part of a TensorFlow [implementation](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/python/platform/flags.py) for [command-line](https://en.wikipedia.org/wiki/Command-line_interface) argument parsing. It happens automatically when using `tf.app.run()`. Internally it uses Python's standard [argparse](https://docs.python.org/3/library/argparse.html), but the API is inspired by Google's gflags.

Formerly Google Commandline Flags, gflags is a Google system for building standard command-line interfaces. There's a [C++ implementation](https://github.com/gflags/gflags), which has [a documentation page](https://gflags.github.io/gflags/) reminiscent of a command-line interface. The [Python gflags](https://github.com/google/python-gflags) is documented primarily via a collection of [examples](https://github.com/google/python-gflags/tree/master/examples).

Python users may be more familiar with the standard [argparse](https://docs.python.org/3/library/argparse.html) API, or perhaps even the older [optparse](https://docs.python.org/2/library/optparse.html), which both achieve functionality similar to that of gflags.

While TensorFlow doesn't include a full gflags implementation, the TensorFlow version appears in pretty many code examples, where it imparts a little bit of extra Google flavor to argument handling for TensorFlow scripts. You can use it, or opt for a separate and possibly more full-featured package, whether it be the full [gflags](https://github.com/google/python-gflags), [argparse](https://docs.python.org/3/library/argparse.html), or [something stranger](https://pythonhosted.org/horetu/).

---

### Bazel

[Bazel](https://bazel.build/) is a build tool like [make](https://www.gnu.org/software/make/). Bazel is [open source](https://github.com/bazelbuild/bazel); [originally](https://en.wikipedia.org/wiki/Bazel_(software)) there was Google's internal "Blaze" tool.

You might encounter Bazel if you're [building TensorFlow from source](https://www.tensorflow.org/install/install_sources), for example.

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

### StreamExecutor

[NVIDIA](http://www.nvidia.com/) currently dominates the [GPU](https://en.wikipedia.org/wiki/Graphics_processing_unit) market, and so their [CUDA](https://en.wikipedia.org/wiki/CUDA) language for programming GPUs is the dominant GPU language. But other vendors would like to sell GPUs too, and they would like everybody to standardize on [OpenCL](https://en.wikipedia.org/wiki/OpenCL) for programming them. Programmers would rather just program once for whatever platform; they would like to have [general-purpose computing on graphics processing units (GPGPU)](https://en.wikipedia.org/wiki/General-purpose_computing_on_graphics_processing_units).

StreamExecutor is Google's GPGPU system. They've [talked about](http://lists.llvm.org/pipermail/llvm-dev/2016-March/096576.html) open-sourcing it directly as part of the [LLVM project](http://llvm.org/), but as far as I know it still exists in open source only [inside TensorFlow](https://github.com/tensorflow/tensorflow/tree/master/tensorflow/stream_executor).

OpenCL support is not necessarily perfect, but you may be able to try it out if you [build from source](https://www.tensorflow.org/install/install_sources). It's [issue #22](https://github.com/tensorflow/tensorflow/issues/22) for the [TensorFlow GitHub project](https://github.com/tensorflow/tensorflow/issues/22).

StreamExecutor is another implementation technology that you aren't likely to encounter directly as a user of TensorFlow.

---

### GFile

Google has C++ file I/O code that avoids thread locking, and [this](https://github.com/tensorflow/tensorflow/tree/master/tensorflow/python/lib/io) is [included](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/python/lib/io/file_io.py) as [part](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/python/platform/gfile.py) TensorFlow.

This is another implementation technology that should benefit TensorFlow users silently within the system.

---

Thanks to Googlers [Julia Ferraioli](https://twitter.com/juliaferraioli), [Pete Warden](https://twitter.com/petewarden), and [Martin Wicke](https://twitter.com/martin_wicke), for a brief [twitter exchange](https://twitter.com/petewarden/status/841062427202527232) that informed this list, and to [Derek Murray](https://twitter.com/mrry) for [correcting](https://twitter.com/mrry/status/841315298221342720) my misconception about gflags in TensorFlow.

I'm working on [Building TensorFlow systems from components](http://conferences.oreilly.com/oscon/oscon-tx/public/schedule/detail/57823), a workshop at [OSCON 2017](https://conferences.oreilly.com/oscon/oscon-tx).
