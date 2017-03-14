# Command-Line Apps and TensorFlow


You can do pretty much with TensorFlow interactively in a Python [REPL](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop) or [notebook](http://jupyter.org/), but there are a lot of reasons why you might want to turn your code into something you can run at the command line.

Running model training may take a lot of time, so you may want to run it "by itself" as an independent process. You may prefer to share `.py` files rather than notebooks, for the universality of text editors over notebook viewers. You may want to make it easier to re-run or eventually productionize your code, and especially to easily run your code on other computers.

You may also want to test the behavior of a system with a variety of values for certain parameters. It becomes easier and more repeatable to keep your code the same and run it with different command-line arguments, rather than editing values in the code directly and re-running.

If you're using a cloud service like Google's [Cloud ML](https://cloud.google.com/products/machine-learning/), command-line arguments may be particularly important. As they [say](https://cloud.google.com/ml-engine/docs/concepts/trainer-considerations), "Command-line arguments are the primary mechanism for communicating with your [TensorFlow program] at the time of execution." Writing your program to support command-line arguments like `--argument_name argument_value` is required, if you're using [Cloud ML's hyperparameter tuning features](https://cloud.google.com/ml-engine/docs/concepts/hyperparameter-tuning-overview).

There are multiple options for how to set up your command-line app. I'll show eight of them below. (Not all of them are good options!) All the scripts below have the same behavior when called like this:

```bash
$ python script.py --color red
a red flower
```

---

### Script [1](code/script1_argv.py): `sys.argv`

```python
import sys

def main():
    assert sys.argv[1] == '--color'
    print('a {} flower'.format(sys.argv[2]))

if __name__ == '__main__':
    main()
```

You can access `sys.argv` to get a list of arguments, split on spaces in the command line, starting with the script name.

This direct approach is concise, for this simple example, but brittle (what if there are multiple arguments, in different order?) and opaque (what was argument 7 again?).

The approaches below will improve on this. All of them will make it clearer what the arguments are, both in the code and by automatically providing interactive help information on the command line, with `python script.py --help`, for example. And they'll all handle the parsing of command lines, taking them from lists of strings to data structures that are more easily used in programs.

---

### Script [2](code/script2_argv_tfappflags.py): `tf.app.flags`

```python
import sys
import tensorflow as tf

flags = tf.app.flags
flags.DEFINE_string(flag_name='color',
                    default_value='green',
                    docstring='the color to make a flower')

def main():
    flags.FLAGS._parse_flags(args=sys.argv[1:])
    print('a {} flower'.format(flags.FLAGS.color))

if __name__ == '__main__':
    main()
```

You shouldn't do this, for multiple reasons, but it does give our first example of using something that manages your command-line interface more than manipulating `sys.argv` directly.

Like all the following examples, we set here a default value and some documentation for the command-line argument. We won't demonstrate other possible features, like specifying constraints on arguments and the like.

The first [reason](http://stackoverflow.com/questions/33932901/whats-the-purpose-of-tf-app-flags-in-tensorflow/33938519#33938519) not to use this particular technique is that while TensorFlow currently includes some argument-parsing functionality, it's there mostly so that it's easy to make cute demos, and it could change at any time.

The second reason not to do this is that we're still providing `sys.argv` ourselves, which is awkward, especially with TensorFlow's mechanism here. The next two examples will continue specifying `sys.argv` like this, before turning to nicer methods.

---

### Script [3](code/script3_argv_gflags.py): gflags

```python
import sys
import gflags

gflags.DEFINE_string(name='color',
                     default='green',
                     help='the color to make a flower')

def main():
    gflags.FLAGS(sys.argv)
    print('a {} flower'.format(gflags.FLAGS.color))

if __name__ == '__main__':
    main()
```

The TensorFlow `tf.app.flags` mechanism is a sort of partial re-implementation of Google's [gflags](https://github.com/google/python-gflags) system for command-line arguments. It's an interesting case of [Google conventions influencing TensorFlow](/20170313-tensorflow_use_of_google_technologies/), and the comparison between the TensorFlow code in Script 2 and the gflags code in Script 3 illustrates this.

The Google gflags for Python [package](https://pypi.python.org/pypi/python-gflags) can be installed with `pip install python-gflags`.

---

### Script [4](code/script4_argv_argparse.py): argparse with `sys.argv`

```python
import sys
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--color',
                    default='green',
                    help='the color to make a flower')

def main():
    args = parser.parse_args(sys.argv[1:])
    print('a {} flower'.format(args.color))

if __name__ == '__main__':
    main()
```

The usual way to write command-line programs in Python is with the Python standard library's [argparse](https://docs.python.org/3/library/argparse.html). Interestingly, while the API of TensorFlow's `tf.app.flags` is very close to gflags, it is itself implemented with argparse.

---

### Script [5](code/script5_tfapprun.py): `tf.app.run()`

```python
import tensorflow as tf

def main(args):
    assert args[1] == '--color'
    print('a {} flower'.format(args[2]))

if __name__ == '__main__':
    tf.app.run()
```

Rather than access `sys.argv` directly, it's nice to use something that will automatically process it.

The `tf.app.run()` functionality does a minimal transformation in this case, passing `sys.argv` as an argument to `main()`.

The choice of `main()` as the function to run is by convention, and can be overridden, for example like `tf.app.run(main=my_cool_function)`.

Just as TensorFlow has built-in functionality that is not gflags but mimics part of gflags, `tf.app.run()` looks a lot like functionality from Google's [apputils](https://github.com/google/google-apputils). That functionality can't be shown quite as independently as in the example here, because it would automatically involve gflags too. That kind of combination between an argument parser and an app runner will be shown in the next examples.

---

### Script [6](code/script6_tfapprun_tfappflags.py): `tf.app.run()` with `tf.app.flags`

```python
import tensorflow as tf

flags = tf.app.flags
flags.DEFINE_string(flag_name='color',
                    default_value='green',
                    docstring='the color to make a flower')

def main(args):
    print('a {} flower'.format(flags.FLAGS.color))

if __name__ == '__main__':
    tf.app.run()
```

Now only un-parsed arguments are passed to `main()`, and this is starting to look like something we could use.

Reasons not to use this built-in TensorFlow functionality still include that it is not officially supported and could change. It's worth noting also though that the TensorFlow argument-parsing and app-running functionality are stripped-down versions, which is enough for simple demos like what I'm showing here, but may not be enough for a real project. And of course you may just feel that some separation of concerns is in order, and TensorFlow shouldn't be doing your machine learning and also managing your command-line arguments.

---

### Script [7](code/script7_apputils_gflags.py): apputils and gflags

```python
import google.apputils.app
import gflags

gflags.DEFINE_string(name='color',
                     default='green',
                     help='the color to make a flower')

def main(args):
    print('a {} flower'.format(gflags.FLAGS.color))

if __name__ == '__main__':
    google.apputils.app.run()
```

The combination of Google's [apputils](https://github.com/google/google-apputils) with gflags looks just like the TensorFlow code in Script 6, but is independent of TensorFlow and offers a lot more features. For example, using `google.apputils.app.run()` automatically gives your app an extra debugging mode.

The Google apputils [package](https://pypi.python.org/pypi/google-apputils) can be installed with `pip install google-apputils`. Possible reasons not to use it include that it has not been updated (in the [open source](https://github.com/google/google-apputils) version) since March 2015.

---

### Script [8](code/script8_argparse.py): argparse

```python
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--color',
                    default='green',
                    help='the color to make a flower')

def main():
    args = parser.parse_args()
    print('a {} flower'.format(args.color))

if __name__ == '__main__':
    main()
```

This is a pretty conventional way to use argparse; just omitting any argument to `parse_args()` brings in `sys.argv` automatically.

A method like this is what you should probably use. For examples of using it in full TensorFlow systems, one place to look is in some of the [Google Cloud ML examples](https://github.com/GoogleCloudPlatform/cloudml-samples).

---

Thanks to [Derek Murray](https://twitter.com/mrry) at [Google Brain](https://research.google.com/teams/brain/) for pointing me in the right direction in understanding the relationship between TensorFlow and gflags.

I'm working on [Building TensorFlow systems from components](http://conferences.oreilly.com/oscon/oscon-tx/public/schedule/detail/57823), a workshop at [OSCON 2017](https://conferences.oreilly.com/oscon/oscon-tx).
