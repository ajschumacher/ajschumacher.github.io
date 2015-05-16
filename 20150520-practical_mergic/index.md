# Practical Mergic

A talk for the [New York Open Statistical Programming Meetup](http://www.meetup.com/nyhackr/) on [Wednesday May 20, 2015](http://www.meetup.com/nyhackr/events/222328498/).


-----

<center>
planspace.org

@planarrowspace
</center>

-----

Hi! I'm Aaron. This is my blog and [my twitter handle](https://twitter.com/planarrowspace). You can get from one to the other. [This presentation](big.html) and a corresponding write-up (you're reading it) are on my blog (which you're on).


-----

> “There are only two hard things in computer science: cache invalidation and naming things.”

-----

[Phil Karlton](http://www.meerkat.com/karlton/) said [this](http://martinfowler.com/bliki/TwoHardThings.html).

When working with data (let's call it “data science” then) you have problems not only with your own names, but also with everybody else's names.

Let's focus on just two classes of problems:


-----

when names are the same

-----

Lots of things can go wrong when names are re-used when they shouldn't be.


-----

when names are *not* the same

-----

It can be even worse when names for the same thing are *not* the same.

Both these problems are closely related to merging, and we'll think a lot about that context.

But first, an example illustrating the importance of checking that your names are unique (not the same).


-----

demo

-----

The [Excel file here](SchoolMathResults20062012Public.xlsx) was [downloaded](http://schools.nyc.gov/NR/rdonlyres/A77DF9C5-BD62-4171-9995-4EB41E7E4067/0/SchoolMathResults20062012Public.xlsx) from the [NYC DOE site](http://schools.nyc.gov/NR/exeres/05289E74-2D81-4CC0-81F6-E1143E28F4C4,frameless.htm).

using `gender.csv`

(originally from https://github.com/ajschumacher/clean_data_with_R)

this happens http://indie-outlook.com/2012/09/19/jeremy-blackman-on-magnolia-pta-0s-1s-and-pink-drink/



big four:

R RecordLinkage
Python dedupe
OpenRefine
SQL?
Max mentioned GIS merges~


Original idea:

"Making merge tables - some entity resolution, python's `dedupe`, etc."


Expanded idea:

"Hmm... My main idea is to talk about techniques around duplicate detection and joins; I don't know if it's technical enough or R-specific enough. A rough synopsis might be something like: Merging data can be a disaster if you don't do it right. There are assumptions to verify before and after a merge. If the assumptions don't hold, there are steps you can take to ameliorate the problem. Constructing a merge table reduces to the problem of de-duplication. And there's Bilenko's work on learnable string distances etc.! http://www.cs.utexas.edu/users/ml/papers/marlin-kdd-03.pdf" Obviously that is not a description that is ready to ship, but that's what I'm thinking about. What do you think? Could that become a talk?"


Jared's feedback:

"I actually really like that talk.  It's about data, not stats or programming."


Submitted:

Title:
Practical Mergic: How to Join Anything

Abstract:
Combining data sets can be a huge pain, with possible problems both obvious and insidious. Aaron will present practical approaches for detecting and avoiding potential pitfalls, as well as rigorous and repeatable processes for generating merge tables through reduction to de-duplication. The focus will be on techniques for quickly achieving high accuracy for data sets of moderate size, with brief excursions into the entity resolution literature, machine learning for distance metrics, and applying clustering and visualization techniques including multidimensional scaling.

Bio:
[Aaron](http://planspace.org/aaron/) is an instructor at the [Metis](http://www.thisismetis.com/) data science boot camp. He is the original author of the [rjstat](http://cran.r-project.org/web/packages/rjstat/) package for R, which is mostly unrelated to this talk. He made [emacs.link](http://emacs.link/), which is also not related to this talk. Aaron blogs at [plan ➔ space](http://planspace.org/) and tweets as [@planarrowspace](https://twitter.com/planarrowspace).


---

OpenRefine clustering!
https://github.com/OpenRefine/OpenRefine/wiki/Clustering
https://github.com/OpenRefine/OpenRefine/wiki/Clustering-In-Depth

Tennis Major Tournament Match Statistics Data Set
https://archive.ics.uci.edu/ml/datasets/Tennis+Major+Tournament+Match+Statistics

Adaptive Duplicate Detection Using Learnable String Similarity Measures
http://www.cs.utexas.edu/users/ml/papers/marlin-kdd-03.pdf

Pair hidden Markov models (Bioinformatics)
http://what-when-how.com/bioinformatics/pair-hidden-markov-models-bioinformatics/

Stanford Entity Resolution Framework
http://infolab.stanford.edu/serf/

Swoosh: a generic approach to entity resolution
http://infolab.stanford.edu/serf/swoosh_vldbj.pdf

Entity Resolution: Tutorial
http://www.umiacs.umd.edu/~getoor/Tutorials/ER_VLDB2012.pdf

Learning-based Entity Resolution with MapReduce
http://dbs.uni-leipzig.de/file/learning_based_er_with_mr.pdf

Multidimensional scaling
http://en.wikipedia.org/wiki/Multidimensional_scaling

MDS in sklearn
http://scikit-learn.org/stable/auto_examples/manifold/plot_mds.html

Entity Resolution for Big Data (summary)
http://www.datacommunitydc.org/blog/2013/08/entity-resolution-for-big-data

D-Dupe: A Novel Tool for Interactive Data Deduplication and Integration
http://linqs.cs.umd.edu/projects/ddupe/

Assertive R
http://www.onthelambda.com/wp-content/uploads/2015/03/assertr.html

Notes on notes:
http://datamade.github.io/dedupe-examples/docs/csv_example.html


---


Thoughts from working earlier:

-  Levenshtein distance is nice, but it turned out I could quickly get a
   "distance" with near-perfect behavior just on zero/nonzero grouping
   by writing a custom one.

   -  This amounted to writing a function to extract a "key" which in
      the case of the tennis players was their first initial and a
      regex-determined "last name". Knowing this would work depended on
      looking at the data.
   -  With a more usual distance metric, it would be nice to see a
      distribution of pairwise distances, which might suggest whether
      there are natural breakpoints.

-  It was easy to find one type of error by looking at groups that
   became too big.

   -  It was nice to look at these as their groups rather than in some
      columnar format - the final output of a merge table is useful but
      not very readable.
   -  To fix the issue I had to go back to the original site of the data
      and then find extra information from another source. Is there a
      way to make at least the first part easier?
   -  It would probably be good to see a distribution of group sizes -
      "100 pairs, 20 singletons, 1 group of fifteen" etc.

-  It's hard to know if I missed errors in the smaller groups and
   singletons who didn't get matched.

-  Can I use tSNE (or similar) to get a visualization based just on a
   distance matrix?


---


For posterity: look how short this is!

```python
#!/usr/bin/env python

import sys
import re


def initialize(name):
    initial = re.match("^[A-Z]", name).group()
    last = re.search("(?<=[ .])[A-Z].+$", name).group()
    return "{}. {}".format(initial, last)


def main():
    items = {item.strip() for item in sys.stdin}
    groups = dict()
    for item in items:
        groups.setdefault(initialize(item), []).append(item)
    print "original,uno"
    for group in sorted(groups.values(), key=len, reverse=True):
        key = sorted(group, key=len)[-1]
        for item in group:
            print "{},{}".format(item, key)

if __name__ == '__main__':
    main()
```


Previous version of docs, focused on the tennis example:

The distance calculation, cutoff evaluation, and partition creation are
currently all in ``mergic make``:

.. code:: bash

    # see all the possible partitions by their statistics
    mergic make names_all.txt

    # make a partition using a cutoff of 0.303
    mergic make 0.303 > partition.json

Edit the partition until it's good. Save it as
``partition_edited.json``.

You can check that your partition is valid and see a cute summary:

.. code:: bash

    mergic check partition_edited.json
    # 669 items in 354 groups

You could proceed directly, but there are also diffing tools! Generate a
diff:

.. code:: bash

    mergic diff partition.json partition_edited.json > partition_diff.json

You can apply a diff to reconstruct an edited version:

.. code:: bash

    mergic apply partition.json partition_diff.json > partition_rebuilt.json

Now if you ``mergic diff`` the files ``partition_edited.json`` and
``partition_rebuilt.json`` the result should just be ``{}`` (no
difference).

To generate a CSV merge table that you'll be able to use with any other
tool:

.. code:: bash

    mergic table partition_edited.json > partition.csv

Now the file ``partition.csv`` has two columns, ``original`` and
``mergic``, where ``original`` contains all the values that appeared in
the original data and ``mergic`` contains the deduplicated keys. You can
join this on to your original data and go to town.
