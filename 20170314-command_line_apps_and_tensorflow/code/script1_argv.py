from __future__ import print_function

import sys


def main():
    assert sys.argv[1] == '--color'
    print('a {} flower'.format(sys.argv[2]))


if __name__ == '__main__':
    main()
