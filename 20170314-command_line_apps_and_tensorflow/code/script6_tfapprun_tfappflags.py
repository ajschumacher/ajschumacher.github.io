from __future__ import print_function

import tensorflow as tf


flags = tf.app.flags
flags.DEFINE_string(flag_name='color',
                    default_value='green',
                    docstring='the color to make a flower')


def main(args):
    print('a {} flower'.format(flags.FLAGS.color))


if __name__ == '__main__':
    tf.app.run()
