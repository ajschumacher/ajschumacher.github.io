# TFRecords via Protocol Buffer Definitions

I've written about [how to use TFRecords](/20170323-tfrecords_for_humans/), and I've written about [how protocol buffer messages are defined](/20170329-protocol_buffers_in_python/). Since the data structures in TFRecords are defined as protocol buffer messages, we can use their definitions to understand them.

Protocol buffer definitions remind me a little bit of [railroad diagrams](https://en.wikipedia.org/wiki/Syntax_diagram) like the ones in Douglas Crockford's [JavaScript: The Good Parts](http://shop.oreilly.com/product/9780596517748.do). Here's how Crockford builds up number literals in JavaScript, starting from digits:

![integer railroad diagram](img/railroad_integer.png)

![fraction railroad diagram](img/railroad_fraction.png)

![exponent railroad diagram](img/railroad_exponent.png)

![number railroad diagram](img/railroad_number.png)

Small components are fully defined, which can then be built into more complex constructs. ([More examples](http://archive.oreilly.com/pub/a/javascript/excerpts/javascript-good-parts/syntax-diagrams.html).) Protocol buffer definitions are built in much the same way.

With comments, the TensorFlow source files [feature.proto](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/core/example/feature.proto) and [example.proto](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/core/example/example.proto) total 400 lines. There are only about 30 lines are not comments. These lines (rearranged slightly) do all the defining of the `Example` and `SequenceExample` formats that are used for TFRecords.

```
message BytesList {
  repeated bytes value = 1;
}
message FloatList {
  repeated float value = 1 [packed = true];
}
message Int64List {
  repeated int64 value = 1 [packed = true];
}
message Feature {
  oneof kind {
    BytesList bytes_list = 1;
    FloatList float_list = 2;
    Int64List int64_list = 3;
  }
}
message Features {
  map<string, Feature> feature = 1;
}
message Example {
  Features features = 1;
}
message FeatureList {
  repeated Feature feature = 1;
}
message FeatureLists {
  map<string, FeatureList> feature_list = 1;
}
message SequenceExample {
  Features context = 1;
  FeatureLists feature_lists = 2;
}
```

These brief definitions give rise to most of the functionality [described](/20170329-protocol_buffers_in_python/) for creating, writing, and reading the TFRecords formats.

<!--

The explanation of the wire format is neat, and explains (for example)
why floats and ints can be packed, but not bytes.

https://developers.google.com/protocol-buffers/docs/encoding

-->

---

I'm working on [Building TensorFlow systems from components](http://conferences.oreilly.com/oscon/oscon-tx/public/schedule/detail/57823), a workshop at [OSCON 2017](https://conferences.oreilly.com/oscon/oscon-tx).
