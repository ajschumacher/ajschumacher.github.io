from __future__ import print_function

import tensorflow as tf


def main(args):
    assert args[1] == '--color'
    print('a {} flower'.format(args[2]))


if __name__ == '__main__':
    tf.app.run()
