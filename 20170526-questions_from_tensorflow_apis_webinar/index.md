# Questions from TensorFlow APIs Webinar

I did [More and Better: The New TensorFlow APIs](/20170524-more_and_better_new_tensorflow_apis/) as a [webinar](https://www.altoros.com/blog/event/more-and-better-the-new-tensorflow-apis/). [Altoros](https://www.altoros.com/) ran it using [GoToWebinar](https://www.gotomeeting.com/webinar), which reported all questions from attendees. Questions and answers:

---

### What should I learn?

> "New to DL and TF... several people have said to not waste time w/Keras, etc, but go deep into TF to really learn it.  From what you said, it seems like TF changes a lot, though.  Recommendations in terms of sequence/path for learning DL concepts and the tools?"

First, regarding the rate of change of TensorFlow: The low-level API should really be quite stable now. It's the high-level APIs that are still settling down a little bit. And even there, it looks like things are getting pretty set. I wouldn't expect Keras to change a lot, in particular.

The question of whether to use a high-level API or a low-level API depends on your goals. I don't think it's a waste of time to use Keras. In fact, I think it would be easier to argue that it's "a waste of time" to dig into low-level TensorFlow implementation details, because there's a lot you can get done much more quickly by using Keras.

It depends on your goals. Do you want to understand every step in the internals of your system? I've heard people like Matt Zeiler suggest that you should write your own deep learning framework from scratch in order to understand all the details of backprop, etc. How far do you want to go?

For most people, I think higher-level interfaces are a good choice. Sometimes they can actually make it easier to learn the concepts that are really important, because you don't have to deal with all the details that can complicate things.

That's not to say that it isn't valuable to get into the low-level details as well. Sometimes you really do need to make changes or understand phenomena that are down at that level. But you don't necessarily need to start at the low level; you can also start at higher levels of abstraction and then learn lower levels later.

As for learning DL concepts and tools, I'm currently a big advocate of [Deep Learning with Python](https://www.manning.com/books/deep-learning-with-python) by François Chollet, the author of Keras. It's still in pre-release, but the chapters that are already available are quite good. I think it's a great book especially for people who are newer to deep learning because it explains a lot of fundamental things in approachable ways.

---

### Keras outside or inside TensorFlow?

> "What is the link between keras and tf that is being shown? I have used Keras and I simply indicate that it should use tensorflow in the backend and my calls do not include tf.xxx.keras.xxx... One of the goals of Keras is to be framework independent. To call from Tensorflow doesn’t really maintain that spirit."

You can still use Keras directly with TensorFlow as the backend, maintaining framework independence. As far as I know, Keras will continue to be developed separately from TensorFlow as well as within the TensorFlow codebase. And for many things, using Keras as it appears inside TensorFlow will work just the same way as using independent Keras with the TensorFlow backend.

Having Keras inside TensorFlow is a convenience, for one, but it should also enable some tighter integrations. I'm expecting the layers API will become even more unified and allow for mixing and matching even more design possibilities. More importantly, I think, Keras models in TensorFlow will be easily convertible to TensorFlow Estimators, which should be pretty neat.

---

### C? C++?

> "how come [TensorFlow is] written in C++ but recommended interfaces should talk to the C part?"

I suppose there are at least two reasons. One is that it standardizes the interface, making it very clear what is stable and safe to build an API to. Another is that as a practical matter, lots of languages have established standard ways to connect to a C API. To read more about TensorFlow's take, check out the [language support documentation](https://www.tensorflow.org/extend/language_bindings).

---

### On-graph? Off-graph?

> "Can you remind folks about what 'on-graph' is?"

TensorFlow's core way of working is by defining a graph of operations and then running them; anything that runs that way is "on-graph."

Normal Python code doesn't work that way; you don't define a graph and then run it, you just run your Python code right away.

Even within the TensorFlow Python API, not everything works by putting things on the graph. For example, `tf.python_io.tf_record_iterator` doesn't use the TensorFlow graph.

I wrote some more about this distinction in [Everything in the Graph? Even Glob?](/20170428-everything_in_the_graph_even_glob/). An example of TensorFlow functionality that exists in both off-graph and on-graph versions is TFRecords processing. I have a post that uses the [off-graph API](/20170323-tfrecords_for_humans/) and two posts that use the on-graph API: [reading from disk](/20170412-reading_from_disk_inside_the_tensorflow_graph/) and [parsing TFRecords](/20170426-parsing_tfrecords_inside_the_tensorflow_graph/).

---

### Python 2? Python 3?

> "Are you using Python 2.x?  If so why?"

I use Python 2.7 a lot because projects I work on use it. I usually recommend that new projects start up with Python 3.

The inertia of Python 2.7 is really incredible, but maybe the tide is turning at last. Under a year ago, this quote [appeared](https://blog.openai.com/infrastructure-for-deep-learning/) on OpenAI's blog:

> "Like much of the deep learning community, we use Python 2.7."

More recently though, another [post](https://blog.openai.com/openai-baselines-dqn/) from OpenAI indicated at least some work is now on Python 3:

> "We use Python 3 and TensorFlow."

---

### Hyperparameter tuning?

> "I would like to know if there is a recommended way to make hyperparameter tuning (number of layers, number of nodes in each layer, learning rate, number of epochs)"

For number of epochs, you can evaluate your model multiple times during training to get train and eval performance curves which should help in making that choice.

For architectural choices like number of layers and number of nodes in each layer, and optimization parameters like learning rate, you can parameterize your code so that choices become command-line arguments, which makes it easier to run experiments and determine what works best.

Making choices based on your previous experience and what's worked for others can save you a lot of time; usually you don't really want to search over _all_ the things you _could_ vary.

When you're really not sure, you can search over all your possible parameters. You may be able to do better than grid search: even [random search](http://scikit-learn.org/stable/modules/grid_search.html#randomized-parameter-optimization) can be better, and [Bayesian optimization](https://en.wikipedia.org/wiki/Bayesian_optimization) could be better yet. Google has [productized hyperparameter tuning](https://cloud.google.com/ml-engine/docs/how-tos/using-hyperparameter-tuning), which may be worth checking out.

---

### Visualization for very large models?

> "I have a question, can we also visualize distributed tensorflow on very large models with billion parameters with tensorboard?"

The answer is probably "yes" but there are multiple aspects to this question.

First, when running  distributed TensorFlow training following the standard pattern, probably you have your chief worker writing out TensorBoard summaries. So that centralizes the "where" of TensorBoard summary writing.

Second, even with small models, it's possible to generate unwieldy amounts of TensorBoard data. You probably want to think carefully about what you want to save during training. For example, you probably don't need to log things every iteration, and you probably don't need to log every parameter value if a histogram will do the job.

Third, some of the things you likely want to visualize for a large model are the same as things you want to visualize for a small model, like loss progression through training. There might not be any changes necessary when model size is different.

If you just want to visualize the model structure (the model graph) then you can take advantage of TensorBoard's grouping functionality so that you can see and reason about components across multiple scales.

In the end, it will depend on exactly what you want to visualize. TensorBoard has a lot of neat features, but it won't be the right choice for every possible problem.

---

### What about serving?

> How does TensorFlow Serving fit in currently?

[TensorFlow Serving](https://tensorflow.github.io/serving/) is largely distinct from the APIs that I showed, except that Estimators can easily [export](https://www.tensorflow.org/api_docs/python/tf/estimator/Estimator#export_savedmodel) the SavedModel format that you want to use for serving.
