# Sparse Tensors and TFRecords

When a matrix, array, or tensor has lots of values that are zero, it can be called _sparse_. You might want to represent the zeros implicitly with a _sparse representation_. TensorFlow has support for this, and the support extends to its TFRecords `Example` format.

Here is a sparse one-dimensional tensor:

```python
[0, 7, 0, 0, 8, 0, 0, 0, 0]
```

The tensor is sparse, in that it has a lot of zeros, but the representation is dense, in that all those zeros are represented explicitly.

A sparse representation of the same tensor will focus only on the non-zero values.

```python
values = [7, 8]
```

We have to also remember where those values occur, by their indices:

```python
indices = [1, 5]
```

The one-dimensional `indices` form will work with some methods, for this one-dimensional example, but in general indices have multiple dimensions, so it will be more consistent (and work everywhere) to represent `indices` like this:

```python
indices = [[1], [5]]
```

With `values` and `indices`, we don't have quite enough information yet. How many zeros are there to the right of the last value? We have to represent the dense shape of the tensor.

```python
dense_shape = [9]
```

These three things together, `values`, `indices`, and `dense_shape`, are a sparse representation of the tensor.

TensorFlow accepts lists of values and NumPy arrays to define dense tensors, and it returns NumPy arrays when dense tensors are evaluated. But what to do with sparse tensors? SciPy has [several](https://docs.scipy.org/doc/scipy/reference/sparse.html) sparse matrix representations, but not a good match for TensorFlow's general sparse tensor form. So for sparse tensors, instead of reusing an existing Python class, TensorFlow provides [`tf.SparseTensorValue`](https://www.tensorflow.org/api_docs/python/tf/SparseTensorValue). These are values that exist outside the TensorFlow graph, so they can be made without a `tf.Session`, for example.

```python
tf.SparseTensorValue(values=values, indices=indices, dense_shape=dense_shape)
## SparseTensorValue(indices=[[1], [5]], values=[7, 8], dense_shape=[9])
```

Using [`tf.SparseTensor`](https://www.tensorflow.org/api_docs/python/tf/SparseTensor) puts that in the TensorFlow graph.

```python
tf.SparseTensor(values=values, indices=indices, dense_shape=dense_shape)
## <tensorflow.python.framework.sparse_tensor.SparseTensor at 0x11a4e0c10>
```

That `tf.SparseTensor` will be constant, since we specified all the pieces of it, and if you run it in a session, you'll get back the equivalent `tf.SparseTensorValue`.

TensorFlow has [operations](https://www.tensorflow.org/api_guides/python/sparse_ops) specifically for working with sparse tensors, such as [`tf.sparse_matmul`](https://www.tensorflow.org/api_docs/python/tf/sparse_matmul). And you can change a sparse matrix to a dense one with [`tf.sparse_tensor_to_dense`](https://www.tensorflow.org/api_docs/python/tf/sparse_tensor_to_dense). These operations live in the graph, so they have to be run to see a result.

```python
sparse = tf.SparseTensor(values=values, indices=indices, dense_shape=dense_shape)
dense = tf.sparse_tensor_to_dense(sparse)
session.run(dense)
## array([0, 7, 0, 0, 0, 8, 0, 0, 0], dtype=int32)
```

Going from dense to sparse seems a little less [straightforward](http://stackoverflow.com/questions/39838234/sparse-matrix-from-a-dense-one-tensorflow) at the moment, so let's continue assuming we already have the components of our sparse representation.

Going to more dimensions is quite natural. Here's a two-dimensional tensor with three non-zero values:

```python
[[0, 0, 0, 0, 0, 7],
 [0, 5, 0, 0, 0, 0],
 [0, 0, 0, 0, 9, 0],
 [0, 0, 0, 0, 0, 0]]
```

This can be represented in sparse form as:

```python
indices = [[0, 5],
           [1, 1],
           [2, 4]]

values = [7, 5, 9]

dense_shape = [4, 6]

tf.SparseTensorValue(values=values, indices=indices, dense_shape=dense_shape)
## SparseTensorValue(indices=[[0, 5], [1, 1], [2, 4]], values=[7, 5, 9], dense_shape=[4, 6])
```

Now, to represent this in a TFRecords `Example` requires a little bit of transformation. [TFRecords](/20170323-tfrecords_for_humans/) only support lists of integers, floats, and bytestrings. The values are easily represented in one `Feature`, but to represent the `indices`, each dimension will need its own `Feature` in the `Example`. The `dense_shape` isn't represented at all; that's left to be specified at parsing.

```python
my_example = tf.train.Example(features=tf.train.Features(feature={
    'index_0': tf.train.Feature(int64_list=tf.train.Int64List(value=[0, 1, 2])),
    'index_1': tf.train.Feature(int64_list=tf.train.Int64List(value=[5, 1, 4])),
    'values': tf.train.Feature(int64_list=tf.train.Int64List(value=[7, 5, 9]))
}))
my_example_str = my_example.SerializeToString()
```

This TFRecord sparse representation can then be [parsed inside the graph](/20170426-parsing_tfrecords_inside_the_tensorflow_graph/) as a [`tf.SparseFeature`](https://www.tensorflow.org/api_docs/python/tf/SparseFeature).

```python
my_example_features = {'sparse': tf.SparseFeature(index_key=['index_0', 'index_1'],
                                                  value_key='values',
                                                  dtype=tf.int64,
                                                  size=[4, 6])}
serialized = tf.placeholder(tf.string)
parsed = tf.parse_single_example(serialized, features=my_example_features)
session.run(parsed, feed_dict={serialized: my_example_str})
## {'sparse': SparseTensorValue(indices=array([[0, 5], [1, 1], [2, 4]]),
##                              values=array([7, 5, 9]),
##                              dense_shape=array([4, 6]))}
```

Support for multi-dimensional sparse features seems to be new in TensorFlow 1.1, and TensorFlow gives this warning when you use `SparseFeature`:

```
WARNING:tensorflow:SparseFeature is a complicated feature config
                   and should only be used after careful consideration
                   of VarLenFeature.
```

`VarLenFeature` doesn't support real sparsity or multi-dimensionality though; it only supports "ragged edges" as in the case when one example has three elements and the next has seven, for example.

It is a little awkward to put together a sparse representation for TFRecords, but it does give you a lot of flexibility. To put a point on it, I don't know what you can do with a `SequenceExample` that you can't do with a regular `Example` using all of `FixedLenFeature`, `VarLenFeature`, and `SparseFeature`.
