# Hello, TensorFlow! (Just the Code)

This is the final code block from [Hello, TensorFlow!][] I like it as
a cheat sheet for TensorFlow basics.

[Hello, TensorFlow!]: https://www.oreilly.com/learning/hello-tensorflow

I updated this code to work with TensorFlow 1.0.1. Coming from TensorFlow 0.8, this required changing 5 of the 17 lines.

```python
import tensorflow as tf

x = tf.constant(1.0, name='input')
w = tf.Variable(0.8, name='weight')
y = tf.multiply(w, x, name='output')
y_ = tf.constant(0.0, name='correct_value')
loss = tf.pow(y - y_, 2, name='loss')
train_step = tf.train.GradientDescentOptimizer(0.025).minimize(loss)

for value in [x, w, y, y_, loss]:
    tf.summary.scalar(value.op.name, value)

summaries = tf.summary.merge_all()

session = tf.Session()
summary_writer = tf.summary.FileWriter('log_simple_stats', session.graph)

session.run(tf.global_variables_initializer())
for i in range(100):
    summary_writer.add_summary(session.run(summaries), i)
    session.run(train_step)

summary_writer.close()
```

[Hello, TensorFlow!](https://www.oreilly.com/learning/hello-tensorflow) is now [an interactive code and video Oriole](https://www.safaribooksonline.com/oriole/hello-tensorflow-oriole) as well.
