# Hello, TensorFlow! (Just the Code)

This is the final code block from [Hello, TensorFlow!][] I like it as
a cheat sheet for TensorFlow basics.

[Hello, TensorFlow!]: https://www.oreilly.com/learning/hello-tensorflow

```python
import tensorflow as tf

x = tf.constant(1.0, name='input')
w = tf.Variable(0.8, name='weight')
y = tf.mul(w, x, name='output')
y_ = tf.constant(0.0, name='correct_value')
loss = tf.pow(y - y_, 2, name='loss')
train_step = tf.train.GradientDescentOptimizer(0.025).minimize(loss)

for value in [x, w, y, y_, loss]:
    tf.scalar_summary(value.op.name, value)

summaries = tf.merge_all_summaries()

sess = tf.Session()
summary_writer = tf.train.SummaryWriter('log_simple_stats', sess.graph)

sess.run(tf.initialize_all_variables())
for i in range(100):
    summary_writer.add_summary(sess.run(summaries), i)
    sess.run(train_step)

summary_writer.close()
```

[Hello, TensorFlow!](https://www.oreilly.com/learning/hello-tensorflow) is now [an interactive code and video Oriole](https://www.safaribooksonline.com/oriole/hello-tensorflow-oriole) as well.
