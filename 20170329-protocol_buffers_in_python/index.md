# Protocol Buffers in Python

Google's data interchange format, [Protocol Buffers](https://en.wikipedia.org/wiki/Protocol_Buffers), is pretty straightforward.

---

### Installing Protobuf

Python support for protocol buffers can be installed with `pip`:

```bash
pip install protobuf
```

The package is imported as `google.protobuf`, but you likely won't need to import it.

To define new protocol buffer formats, you'll also want the `protoc` tool. One way to get it is to find and install a system-specific package, but you can also get it by installing another Google Python package, `grpcio-tools`:

```bash
pip install grpcio-tools
```

This won't put a `protoc` executable in your `PATH`, but it will let you run `protoc` via Python, as `python -m grpc_tools.protoc`. For convenience, you can add an alias in your shell:

```bash
alias protoc='python -m grpc_tools.protoc'
```

---

### Defining Protobuf Messages

The details of protocol buffer messages types are defined in `.proto` files like [`my_example.proto`](my_example.proto).

```
syntax = "proto3";

message Bottle {
  string note = 1;
}
```

Syntax version 3 has to be specified, as the default is still version 2.

We're defining a fairly dull message. A `Bottle` can contain one `note`, which is a string.

The number one there is not setting a default value, but specifying a numbering that's used internally when reading and writing binary representations of our messages.

---

### Generating Code for our Protobuf

Assuming we're in the same directory as `my_example.proto`, we can use `protoc` to generate some Python code corresponding to the message type we defined:

```bash
protoc --proto_path=./ --python_out=./ my_example.proto
```

This will produce a new file `my_example_pb2.py`. (Syntax version 3 does not affect the filename here.)

---

### Using Protobuf Messages in Python

With the generated `my_example_pb2.py` code, we can use our message type in Python, and take advantage of features like serialization and deserialization.

```python
import my_example_pb2

my_bottle = my_example_pb2.Bottle(note='Ahoy!')

with open('my_bottle.pb', 'wb') as f:
    f.write(my_bottle.SerializeToString())

with open('my_bottle.pb', 'rb') as f:
    new_bottle = my_example_pb2.Bottle().FromString(f.read())
```

This looks a lot like [examples with TFRecords](/20170323-tfrecords_for_humans/), because they use the same mechanism.

---

### More Information

The example here is deliberately minimal. For more detail, the [Google protocol buffers site](https://developers.google.com/protocol-buffers/) is quite good, with a very nice [Python tutorial](https://developers.google.com/protocol-buffers/docs/pythontutorial).

---

I'm working on [Building TensorFlow systems from components](http://conferences.oreilly.com/oscon/oscon-tx/public/schedule/detail/57823), a workshop at [OSCON 2017](https://conferences.oreilly.com/oscon/oscon-tx).
