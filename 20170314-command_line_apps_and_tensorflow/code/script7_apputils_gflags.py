from __future__ import print_function

import google.apputils.app
import gflags


gflags.DEFINE_string(name='color',
                     default='green',
                     help='the color to make a flower')


def main(args):
    print('a {} flower'.format(gflags.FLAGS.color))


if __name__ == '__main__':
    google.apputils.app.run()
