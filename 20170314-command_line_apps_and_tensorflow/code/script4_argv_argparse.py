from __future__ import print_function

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
