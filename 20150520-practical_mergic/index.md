# Practical Mergic

*A talk for the [New York Open Statistical Programming Meetup](http://www.meetup.com/nyhackr/) on [Wednesday May 20, 2015](http://www.meetup.com/nyhackr/events/222328498/). Including some material originally given in a [lightning talk](/20150514-mergic/) at the [May meeting](http://www.meetup.com/PyDataNYC/events/222329250/) ([registration](http://www.bloomberg.com/event-registration/?id=39288)) of the [PyData NYC meetup group](http://www.meetup.com/PyDataNYC/).*


-----

<center>
planspace.org

@planarrowspace
</center>

-----

Hi! I'm Aaron. This is my blog and [my twitter handle](https://twitter.com/planarrowspace). You can get from one to the other. [This presentation](big.html) and a corresponding write-up (you're reading it) are on my blog (which you're on).


-----

<img width="1000%" title="Tweed Courthouse" src="tweed.jpg" />

-----

*[Image from Wikimedia Commons](http://commons.wikimedia.org/wiki/File:Tweed_Courthouse_north_main_facade_118443pv.jpg).*

The first time I wrote software to address this problem, I was working for the New York City Department of Education, in Tweed Courthouse.

The NYC DOE had unique IDs for every student, and for every teacher, but did not have unique IDs for principals, at least not in every data system at that time. This made sense, because there are only about sixteen hundred New York City public schools.

Those of you who have experience with humans will recall that names are not unique IDs. People change their names, or add titles like “PhD”, or have their names differently at different times for no good reason. In the case of principals, sometimes they even switch schools and change their names *at the same time*.

In a situation like this, an approximate solution is not acceptable. The DOE makes some decisions based on data, God bless them.

I had to get a perfect matching of all these principals' names, so I wrote some code to help speed the process. I still had to verify proposed pairs, and it was awful, and it was a long time ago, and I wished there was a better way to do it.

My primary concerns were, and are, to speed up the de-duplication process while allowing editing by hand and still being reproducible and easily auditable by humans.

I've developed a process, or workflow, that I think is pretty good, and I've written a new tool to help with this process.

I've also learned about some of the ecosystem of techniques and tools available, and I'll talk about these as well.

I'll finish by suggesting that we probably need to do something entirely different.

I've thought about this issue a little bit, but more than issuing a report I'd like to encourage a discussion that might lead to more and better work with data.


-----

> “There are only two hard things in computer science: cache invalidation and naming things.”

-----

[Phil Karlton](http://www.meerkat.com/karlton/) [said](http://martinfowler.com/bliki/TwoHardThings.html) that “There are only two hard things in computer science: cache invalidation and naming things.”

When working with data (let's call it “data science” then, instead of “computer science”) you have problems not only with your own names, but also with everybody else's names.

It's just semantics, I suppose.


-----

What are we talking about?

-----

이름이란 것은 정말 중요합니다. 예를 들면, 미국에서 한국말로...

My Korean isn't that good. What I'm trying to say here is that agreeing on names is important, and the issue is a big one.

Maintaining a practical focus, let's focus on just two classes of problems:


-----

when names are the same

-----

Lots of things can go wrong when names are re-used when they shouldn't be.


-----

when names aren't the same

-----

It can be even worse when names for the same thing are *not* the same.

Both these problems are closely related to merging, and we'll think a lot about that context.

But first, an example illustrating the importance of checking that your names are unique (not the same).


-----

demo: kinds of boys

-----

The [Excel file here](SchoolMathResults20062012Public.xlsx) was [downloaded](http://schools.nyc.gov/NR/rdonlyres/A77DF9C5-BD62-4171-9995-4EB41E7E4067/0/SchoolMathResults20062012Public.xlsx) from the [NYC DOE site](http://schools.nyc.gov/NR/exeres/05289E74-2D81-4CC0-81F6-E1143E28F4C4,frameless.htm). It contains standardized test results for New York City schools for individual grades and other sub-groups. We'll use two sheets that have been saved as CSV (originally for my [Clean Data with R](http://planspace.org/2014/01/07/clean-data-with-r/) talk), `gender.csv` and `all.csv`. The R script itself is in [check_unique.R](check_unique.R).

There's a little setup to make reading the data easier.

```r
library("dplyr")

read.doe <- function(filename) {
  data <- read.csv(filename, as.is=TRUE,
                   skip=6, check.names=FALSE,
                   na.strings="s")
  stopifnot(names(data) == c("DBN", "Grade", "Year", "Category",
                             "Number Tested","Mean Scale Score",
                             "#","%","#","%","#","%","#","%","#","%"))
  names(data) <- c("dbn", "grade", "year", "category",
                   "num_tested", "mean_score",
                   "num1", "per1", "num2", "per2", "num3", "per3", "num4", "per4",
                   "num34", "per34")
 return(tbl_df(data))
}
```

Now we can start looking at the data, using [dplyr](https://github.com/hadley/dplyr):

```r
gender <- read.doe("gender.csv")

gender
## Source: local data frame [68,028 x 16]
##
##       dbn grade year category num_tested mean_score num1 per1 num2 per2
## 1  01M015     3 2006   Female         23        675    0  0.0    7 30.4
## 2  01M015     3 2006     Male         16        657    2 12.5    4 25.0
## 3  01M015     3 2007   Female         11        679    2 18.2    0  0.0
## 4  01M015     3 2007     Male         20        668    0  0.0    3 15.0
## 5  01M015     3 2008   Female         17        661    0  0.0    5 29.4
## 6  01M015     3 2008     Male         20        674    0  0.0    1  5.0
## 7  01M015     3 2009   Female         13        667    0  0.0    1  7.7
## 8  01M015     3 2009     Male         20        668    0  0.0    3 15.0
## 9  01M015     3 2010   Female         13        681    2 15.4    7 53.8
## 10 01M015     3 2010     Male         13        673    4 30.8    5 38.5
## ..    ...   ...  ...      ...        ...        ...  ...  ...  ...  ...
## Variables not shown: num3 (int), per3 (dbl), num4 (int), per4 (dbl), num34
##   (int), per34 (dbl)
```

What's our unique key for this data set? It looks like it should be `dbn` (a unique identifier for a school), `grade`, `year`, and `category`. Let's check. The following should be zero if there are no duplicates.

```r
gender %>%
  select(dbn, grade, year, category) %>%
  duplicated %>%
  sum
## [1] 1421
```

Shocking! Seeing that there are duplicates doesn't yet tell us how the duplicates are distributed; is it 1,422 copies of the same combination, or something else?

```r
gender %>%
  group_by(dbn, grade, year, category) %>%
  summarize(n=n()) %>%
  group_by(n) %>%
  summarize(count=n())
## Source: local data frame [2 x 2]
##
##   n count
## 1 1 65186
## 2 2  1421
```

Much like using `table`, now we can see that most key combinations appear just once, but 1,421 appear twice. Interesting! Let's look at them.

```r
gender %>%
  group_by(dbn, grade, year, category) %>%
  filter(1 < n())
## Source: local data frame [2,842 x 16]
## Groups: dbn, grade, year, category
##
##       dbn      grade year category num_tested mean_score num1 per1 num2
## 1  01M019          3 2010     Male         20        677    3   15    7
## 2  01M019          3 2010     Male          2         NA   NA   NA   NA
## 3  01M019          4 2010     Male         20        674    1    5    9
## 4  01M019          4 2010     Male          1         NA   NA   NA   NA
## 5  01M019          5 2010     Male          1         NA   NA   NA   NA
## 6  01M019          5 2010     Male         17        688    0    0    3
## 7  01M019 All Grades 2010     Male          4         NA   NA   NA   NA
## 8  01M019 All Grades 2010     Male         57         NA    4    7   19
## 9  01M020          3 2010     Male         50        686    8   16   15
## 10 01M020          3 2010     Male          1         NA   NA   NA   NA
## ..    ...        ...  ...      ...        ...        ...  ...  ...  ...
## Variables not shown: per2 (dbl), num3 (int), per3 (dbl), num4 (int), per4
##   (dbl), num34 (int), per34 (dbl)
```

Looks like there are two different kinds of males! How strange! Can we see what's going on by looking at the rest of the file?

```r
gender %>%
  filter(dbn=='01M019', year==2010, grade==3)
## Source: local data frame [3 x 16]
##
##      dbn grade year category num_tested mean_score num1 per1 num2 per2
## 1 01M019     3 2010   Female         16        687    0    0    9 56.3
## 2 01M019     3 2010     Male         20        677    3   15    7 35.0
## 3 01M019     3 2010     Male          2         NA   NA   NA   NA   NA
## Variables not shown: num3 (int), per3 (dbl), num4 (int), per4 (dbl), num34
##   (int), per34 (dbl)
```

Unfortunately not; we'll have to look at additional data to try to determine what's going on. (This is typical.)

```r
all_students <- read.doe("all.csv")
data <- bind_rows(all_students, gender)

data %>%
  filter(dbn=='01M019', year==2010, grade==3)
## Source: local data frame [4 x 16]
##
##      dbn grade year     category num_tested mean_score num1 per1 num2 per2
## 1 01M019     3 2010 All Students         36        682    3  8.3   16 44.4
## 2 01M019     3 2010       Female         16        687    0  0.0    9 56.3
## 3 01M019     3 2010         Male         20        677    3 15.0    7 35.0
## 4 01M019     3 2010         Male          2         NA   NA   NA   NA   NA
## Variables not shown: num3 (int), per3 (dbl), num4 (int), per4 (dbl), num34
##   (int), per34 (dbl)
```

It looks like these extra males aren't being counted in the total for “All Students”, so maybe we can drop them. Or maybe the “All Students” total is wrong.

-----

<img width="1000%" title="This happens." src="this_happens.png" />

-----

*Original image from [Magnolia](http://en.wikipedia.org/wiki/Magnolia_%28film%29) via [Indie Outlook](http://indie-outlook.com/2012/09/19/jeremy-blackman-on-magnolia-pta-0s-1s-and-pink-drink/).*

> “This happens. This is a thing that happens.”

This is a scene from a movie called Magnolia when it's raining frogs. One of the things they say in that movie is that strange things happen, and if you've worked with any variety of data sets, you've probably encountered very strange things. You need to check everything—including things that you shouldn’t have to check.


-----

merge

-----

One big reason to want nice unique IDs is that you would like to merge two data sets, and you need something to match records by. Let's do a quick refresher on merging, or joining.


-----

<img height="1000%" title="dplyr cheat sheet joins" src="dplyr_joins.png" />

-----

This is a section from [RStudio](http://www.rstudio.com/)'s [cheatsheet](http://www.rstudio.com/resources/cheatsheets/) for [dplyr](https://github.com/hadley/dplyr). These cheatsheets are fantastic.

We'll do a merge between two data sets. For simplicity say that they have one column which is an identifier for each row, and some data in other columns. There are a couple ways we can join the data.

Some people like to think about these in terms of Venn diagrams.


-----

<img width="1000%" title="left join" src="left_join.png" />

-----

This picture comes from [Jeff Atwood](https://twitter.com/codinghorror)'s post called [visual explanation of SQL joins](http://blog.codinghorror.com/a-visual-explanation-of-sql-joins/).

A former co-worker told me that seeing these pictures changed his life. I hope you like them.

This is a left join: you get all the keys from the left data set, regardless of whether they're in the right data set.


-----

<img width="1000%" title="right join" src="right_join.png" />

-----

Jeff Atwood doesn't have a picture of a right join on his blog, but you can make one with a little [ImageMagick](http://www.imagemagick.org/).

```bash
convert -rotate 180 left_join.png right_join.png
```

You're welcome.


-----

<img width="1000%" title="inner join" src="inner_join.png" />

-----

An inner join, or natural join, only gives you results for keys that appear in both the left and right data sets.


-----

<img width="1000%" title="outer join" src="outer_join.png" />

-----

And an outer join gives you everything. Great!

There are a few other terms we could add, but let's not.


-----

<img height="1000%" title="dplyr cheat sheet joins" src="dplyr_joins.png" />

-----

Here's the `dplyr` summary again. You can see how you can introduce missing values when doing left, right, and outer joins.

Ready? Here's a test.


-----

How many rows do you get when you outer join two tables?

-----

Think about this question, discuss it with somebody near you, come up with everything you can say about the number of rows you might expect when you join two tables. Introduce any quantities you think you'd like to know.

Take about three minutes and then come back.

*three minutes pass*

Say there are *N* rows in the first table and *M* rows in the second table. Then the smallest number of rows we can get from the outer join is the greater of *N* and *M*. But we might get as many as *N \* M* rows, if all the keys are the same!

If you said the maximum was *N + M*, you were probably assuming, implicitly or explicitly, that all they keys were unique. This is a common assumption that you should really check.


-----

```r
> nrow(first)
## [1] 3
> nrow(second)
## [1] 3
> result <- merge(first, second)
> nrow(result)
## [1] 3
```
-----

*This code is runnable in [count_trouble.R](count_trouble.R).*

Is it enough to check the numbers of rows when we do joins?

This does an inner join, which is the default for `merge` in R.

Think about it.


-----

```text
 x    y1        x   y2        x    y1   y2
 1 looks        1 good        1 looks good
 2    oh        2  boy        2    oh  boy
 3  well        2   no        2    oh   no
```
-----

There is no peace while you don't have unique IDs.

There are times when you don't want every ID to be unique in a table, but really really often you do. You probably want to check that uniqueness explicitly.


-----

when names are the same

-----

This has been a discussion of problems arising from names being the same.


-----

when names aren't the same

-----

Probably also want to check that the intersection you get is what you expect.

You don't want to silently drop a ton of rows when you merge!

This is the beginning of our problems with names that aren't the same.


-----

demo: let's play tennis

-----

*Here begins material also present in [ajschumacher/mergic:tennis](https://github.com/ajschumacher/mergic/tree/master/tennis).*

Download the [Tennis Major Tournament Match Statistics Data Set](https://archive.ics.uci.edu/ml/datasets/Tennis+Major+Tournament+Match+Statistics) from the [UC Irvine Machine Learning Repository](https://archive.ics.uci.edu/ml/) into an empty directory:

```bash
$ wget https://archive.ics.uci.edu/ml/machine-learning-databases/00300/Tennis-Major-Tournaments-Match-Statistics.zip
```

This file should be stable, but it's also included [here](Tennis-Major-Tournaments-Match-Statistics.zip) and/or you can verify that its `md5` is `e9238389e4de42ecf2daf425532ce230`.


Unpack eight CSV files from the `Tennis-Major-Tournaments-Match-Statistics.zip`:

```bash
$ unzip Tennis-Major-Tournaments-Match-Statistics.zip
```


You should see that the first two columns of each file contain player names, though the column names are not consistent. For example:

```bash
$ head -2 AusOpen-women-2013.csv | cut -c 1-40
## Player1,Player2,Round,Result,FNL1,FNL2,F
## Serena Williams,Ashleigh Barty,1,1,2,0,5

$ head -2 USOpen-women-2013.csv | cut -c 1-40
## Player 1,Player 2,ROUND,Result,FNL.1,FNL
## S Williams,V Azarenka,7,1,2,1,57,44,43,2
```


Make a `names.txt` with all the names that appear:

```bash
$ for filename in *2013.csv
do
    for field in 1 2
    do
        tail +2 $filename | cut -d, -f$field >> names.txt
    done
done
```


Now you have a file with 1,886 lines, each one of 669 unique strings, as you can verify:

```bash
$ wc -l names.txt
## 1886

$ sort names.txt | uniq | wc -l
## 669
```

There are too many unique strings—sometimes more than one string for the same player. As a result, a count of the most common names will not accurately tell us who played the most in these 2013 tennis competitions.


```bash
$ sort names.txt | uniq -c | sort -nr | head
##  21 Rafael Nadal
##  17 Stanislas Wawrinka
##  17 Novak Djokovic
##  17 David Ferrer
##  15 Roger Federer
##  14 Tommy Robredo
##  13 Richard Gasquet
##  11 Victoria Azarenka
##  11 Tomas Berdych
##  11 Serena Williams
```

The list above is not the answer we’re looking for. We want to be correct.


-----

single field de-duplication

-----

We're going to think about this problem, which is pretty common, of de-duplicating (or making a merge table for) a single text field.


-----

```
Lukas Lacko             F Pennetta
Leonardo Mayer          S Williams
Marcos Baghdatis        C Wozniacki
Santiago Giraldo        E Bouchard
Juan Monaco             N.Djokovic
Dmitry Tursunov         S.Giraldo
Dudi Sela               Y-H.Lu
Fabio Fognini           T.Robredo
...                     ...
```
-----

*Here begins material also presented in a [lightning talk](/20150514-mergic/) at the [May meeting](http://www.meetup.com/PyDataNYC/events/222329250/) ([registration](http://www.bloomberg.com/event-registration/?id=39288)) of the [PyData NYC meetup group](http://www.meetup.com/PyDataNYC/).*

To be clear, the problem looks like this. And the problem often looks like this: You have either two columns with slightly different versions of identifiers, or one long list of things that you need to resolve to common names. These problems are fundamentally the same.

Do you see the match here? (It's Santiago!)

So we need to find the strings that refer to the same person.


-----

demo: Open Refine

-----

[Open Refine](http://openrefine.org/) is quite good.

An interesting side story is that Open Refine was formerly Google Refine, and before that [Metaweb](http://en.wikipedia.org/wiki/Metaweb)'s “Freebase Gridworks”. Google is shutting down [Freebase](http://www.freebase.com/), and we have to hope that [Wikidata](https://www.wikidata.org/) will then be the open match for Google's [Knowledge Graph](http://en.wikipedia.org/wiki/Knowledge_Graph).


# slides from `mergic` lightning talk

# [tennis](https://github.com/ajschumacher/mergic/tree/master/tennis) example


big four:

R RecordLinkage
Python dedupe
OpenRefine
SQL?
Max mentioned GIS merges~



-----

<img width="1000%" title="Open Data Science Conference" src="open_data_sci_con.png" />

-----

I also hope to see you at [Open Data Science Con](http://opendatascicon.com/) in Boston!


-----

Thanks!

-----

Thank you!


-----

<center>
planspace.org

@planarrowspace
</center>

-----

This is just me again.

끝!



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
