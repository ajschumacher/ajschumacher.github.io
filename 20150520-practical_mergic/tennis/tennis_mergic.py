#!/usr/bin/env python

import re
import Levenshtein
import mergic


def first_initial_last(name):
    initial = re.match("^[A-Z]", name).group()
    last = re.search("(?<=[ .])[A-Z].+$", name).group()
    return "{}. {}".format(initial, last)


def distance(x, y):
    x = first_initial_last(x)
    y = first_initial_last(y)
    return Levenshtein.distance(x, y)


mergic.Blender(distance).script()
