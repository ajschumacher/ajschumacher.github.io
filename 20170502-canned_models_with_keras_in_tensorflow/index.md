# Pre-trained Models with Keras in TensorFlow

With TensorFlow 1.1, [Keras](https://github.com/fchollet/keras) is now at `tf.contrib.keras`. With TensorFlow 1.2, it'll be at `tf.keras`. This is great for making new models, but we also get canned models previously found [outside core Keras](https://github.com/fchollet/deep-learning-models). It's so easy to classify images!

```python
import tensorflow as tf

model = tf.contrib.keras.applications.ResNet50()
```

This will automatically download trained weights for a model based on [Deep Residual Learning for Image Recognition](https://arxiv.org/abs/1512.03385). The weights are cached below your home directory, in `~/.keras/models/`.

Convenient image tools are also included. Let's use an [image](https://github.com/ajschumacher/imagen/blob/master/imagen/n01882714_4157_koala_bear.jpg) of a koala from the [imagen](https://github.com/ajschumacher/imagen) ImageNet subset.

![original koala](n01882714_4157_koala_bear.jpg)

```python
filename = 'n01882714_4157_koala_bear.jpg'
image = tf.contrib.keras.preprocessing.image.load_img(
    filename, target_size=(224, 224))
```

This model can take input images that are 224 pixels on a side, so we have to make our image that size. We're just doing it by squishing, in this case.

![smaller koala](smaller_koala.jpg)

We'll make that into an array that the model can take as input.

```python
import numpy as np

array = tf.contrib.keras.preprocessing.image.img_to_array(image)
array = np.expand_dims(array, axis=0)
```

Now we can classify the image!

```python
probabilities = model.predict(array)
```

We have one thousand probabilities, one for each class the model knows about. To interpret the result, we can use another helpful function.

```python
tf.contrib.keras.applications.resnet50.decode_predictions(probabilities)
## [[(u'n01882714', u'koala', 0.99466419),
##   (u'n02497673', u'Madagascar_cat', 0.0013330306),
##   (u'n01877812', u'wallaby', 0.00085774728),
##   (u'n02137549', u'mongoose', 0.00063530984),
##   (u'n02123045', u'tabby', 0.00056512095)]]
```

Great success! The model is highly confident that it's looking at a koala. Not bad.

It's pretty fun that this kind of super-easy access to quite good pre-trained models is now available all within the TensorFlow package. Just `pip install` and go!

---

The thousand ImageNet categories this model knows about include some things that are commonly associated with people, but not a "person" class. Still, just for fun, what will `ResNet50` say about me?

```python
## [[(u'n02883205', u'bow_tie', 0.3144455),
##   (u'n03787032', u'mortarboard', 0.059674311),
##   (u'n02992529', u'cellular_telephone', 0.049916871),
##   (u'n04357314', u'sunscreen', 0.048197504),
##   (u'n04350905', u'suit', 0.03481029)]]
```

I guess I'll take it?

![Aaron](aaron.jpg)

---

**Notes:**

The model may have been trained on the very koala picture we're testing it with. I'm okay with that. Feel free to test your own koala pictures!

There's also another function, `resnet50.preprocess_input`, which in theory should help the model work better, but my tests gave seemingly worse results when using that pre-processing. It would be used like this:

```python
array = tf.contrib.keras.applications.resnet50.preprocess_input(array)
```

Keras in TensorFlow also contains `vgg16`, `vgg19`, `inception_v3`, and `xception` models as well, along the same lines as `resnet50`.


---

I'm working on [Building TensorFlow systems from components](http://conferences.oreilly.com/oscon/oscon-tx/public/schedule/detail/57823), a workshop at [OSCON 2017](https://conferences.oreilly.com/oscon/oscon-tx).
