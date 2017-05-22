# Navigating TensorFlow Estimator Documentation

The TensorFlow documentation keeps improving, but it can still be hard to find what you're looking for. Here's a way of organizing [Estimator](https://www.tensorflow.org/api_docs/python/tf/estimator/Estimator)s or [`tf.contrib.learn`](https://www.tensorflow.org/api_guides/python/contrib.learn) documentation, from high-level to low-level:

 * Using Estimators (already made or "canned")
     * [`DNNClassifier` on iris dataset](https://www.tensorflow.org/get_started/tflearn)
     * [`LinearClassifier` (logistic) on census income dataset](https://www.tensorflow.org/tutorials/wide)
     * [`DNNLinearCombinedClassifier` (extends census income example)](https://www.tensorflow.org/tutorials/wide_and_deep)
 * Aspects of using Estimators
     * [Feature columns (in context of linear models)](https://www.tensorflow.org/tutorials/linear)
     * [Using `input_fn`; `DNNRegressor` on Boston housing dataset](https://www.tensorflow.org/get_started/input_fn)
     * [Logging etc. with `ValidationMonitor` (extends iris example)](https://www.tensorflow.org/get_started/monitors)
 * Making your own Estimator
     * [With `layers` in a `model_fn` on the abalones dataset](https://www.tensorflow.org/extend/estimators)
     * [With `layers` in a `model_fn` on MNIST](https://www.tensorflow.org/tutorials/layers)
 * Lower-level API than Estimators
     * [Use the lower-level API to make a system for MNIST](https://www.tensorflow.org/get_started/mnist/pros#build_a_multilayer_convolutional_network)
