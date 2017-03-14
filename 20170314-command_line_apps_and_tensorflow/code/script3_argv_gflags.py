from __future__ import print_function

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
