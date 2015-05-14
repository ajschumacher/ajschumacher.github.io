# mergic

*A lightning talk at the [May meeting](http://www.meetup.com/PyDataNYC/events/222329250/) ([registration](http://www.bloomberg.com/event-registration/?id=39288)) of the [PyData NYC meetup group](http://www.meetup.com/PyDataNYC/), introducing [mergic](https://github.com/ajschumacher/mergic).*

-----

<center>
planspace.org

@planarrowspace
</center>

-----

Hi! I'm Aaron. This is my blog and my twitter handle. You can get from one to the other. [This presentation](big.html) and a corresponding write-up (you're reading it) are on my blog.


-----

<img height="1000%" title="ermahgerd mergic" src="ermahgerd.png" />

-----

Down to business!


-----

workflow support for reproducible deduplication and merging

-----

Mergic is a simple tool designed to make it less painful when you need to merge things that don't yet merge.


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

The problem often looks like this: You have either two columns with slightly different versions of identifiers, or one long list of things that you need to resolve to common names. These problems are fundamentally the same.

Do you see the match here? (It's Santiago!)


-----

<img width="1000%" title="big data" src="big_data.png" />

-----

A quick disclaimer!

This is John Langford's slide, about what big data is. He says that small data is data for which O(n<sup>2</sup>) algorithms are feasible. Currently mergic is strictly for this kind of artisanal data, where we want to ensure that our matching is correct but want to reduce the amount of human work to ensure that. And we are about to get very O(n<sup>2</sup>).


-----

```
Santiago Giraldo,Leonardo Mayer
Santiago Giraldo,Dudi Sela
Santiago Giraldo,Juan Monaco
Santiago Giraldo,S Williams
Santiago Giraldo,C Wozniacki
Santiago Giraldo,S.Giraldo
Santiago Giraldo,Marcos Baghdatis
Santiago Giraldo,Y-H.Lu
...
```
-----

So we make all possible pairs of identifiers! This is annoying for a computer, and awful for humans. The computer can calculate a lot of pairwise distances, but I don't want to look at all the pairs.

Do you see the match here? (It's Santiago again!)


-----

```
INFO:dedupe.training:1.0
name : stanislas wawrinka

name : stanislas wawrinka

Do these records refer to the same thing?
(y)es / (n)o / (u)nsure / (f)inished

O.o?
```
-----

The Python [dedupe](https://github.com/datamade/dedupe) project is very cool, and could be exactly what you want for larger amounts of more complex data. There's even work on getting learnable edit distances implemented now, which would be great to see. But for very simple data sets, `dedupe` can be overkill. But you don't get much sense of the big picture of your data set, and it's still very pair-oriented.


-----

```
Karolina Pliskova,K Pliskova
```
-----

Aside from being a drag to look at, there's a bigger problem with verifying equality on a pairwise basis.

Do these two records refer to the same person? (Tennis fans may see where I'm going with this.)


-----

```
Kristyna Pliskova,K Pliskova
```
-----

Karolina has a twin sister, and Kristyna also plays professional tennis! This may well not be obvious if you only look at pairs individually. What matters is the set of names that are transitively judged as equal.


-----

sets > pairs

-----

Both perceptually and logically, it's better to think in sets than in a bunch of individual pairs.


-----

<img width="1000%" title="Open Refine" src="open_refine.png" />

-----

[Open Refine](http://openrefine.org/) is pretty good. Their interface shows you some useful information, and you can see sets of things. There's even some idea of repeatable transformations. But there's so much functionality wrapped up in a mostly graphical interface that it's hard to make it part of an easily repeatable workflow. And while there are a bunch of built-in distance functions, I'm not sure whether it's possible to use a custom distance function in Open Refine.


-----

 * simple
 * customizable
 * reproducible

-----

So the goals of `mergic` are to be:

 * simple, meaning largely text-based and obvious
 * customizable, meaning you can easily use a custom distance function
 * reproducible, meaning every part can be done again automatically


-----

demo

-----

Here's a quick run-through of the `mergic` workflow. It's similar to the one in the [README](https://github.com/ajschumacher/mergic).

```bash
pew new pydata
```

I'll start by making a new [virtual environment](https://virtualenv.pypa.io/) using [pew](https://github.com/berdario/pew).

```bash
pip install mergic
```

`mergic` is very new (version 0.0.4) and it currently installs with no extra dependencies.

```bash
mergic -h
```

`mergic` runs includes a command-line script based on [argparse](https://docs.python.org/2/library/argparse.html) that uses a default string distance function.

```
usage: mergic [-h] {calc,make,check,diff,apply,table} ...

positional arguments:
  {calc,make,check,diff,apply,table}
    calc                calculate all partitions of data
    make                make a JSON partition from data
    check               check validity of JSON partition
    diff                diff two JSON partitions
    apply               apply a patch to a JSON partition
    table               make merge table from JSON partition

optional arguments:
  -h, --help            show this help message and exit
```

The command line script has a number of sub-commands that expose its functionality.

```bash
head -4 RLdata500.csv
```

We'll try `mergic` out with an example data set from [R](http://www.r-project.org/)'s [RecordLinkage](http://journal.r-project.org/archive/2010-2/RJournal_2010-2_Sariyar+Borg.pdf) package.

```
CARSTEN,,MEIER,,1949,7,22
GERD,,BAUER,,1968,7,27
ROBERT,,HARTMANN,,1930,4,30
STEFAN,,WOLFF,,1957,9,2
```

The data is fabricated name and birthdate from a hypothetical German hospital. It has a number of columns, but for `mergic` we'll just treat the rows of CSV as single strings.

```bash
mergic calc RLdata500.csv
```

The `calc` subcommand calculates all the pairwise distances and provides diagnostics about possible groupings that could be produced.

```
num groups, max group, num pairs, cutoff
----------------------------------------
       500,         1,         0, -0.982456140351
       497,         2,         3, 0.0175438596491
```

With a cutoff lower than any actual encountered string distance, every item stays separate, the maximum group size is one, and there are no pairs within those groups to evaluate.

```
         2,       499,    124251, 0.416666666667
         1,       500,    124750, 0.418181818182
```

On the other extreme, we could group every item together in a giant mega-group.

```
       451,         2,        49, 0.111111111111
       450,         2,        50, 0.115384615385
       449,         3,        52, 0.125
```

`mergic` gives you a choice about how big the groups it will produce will be. In this case, there's a cutoff of about 0.12 that will produce 50 groups of two items, which looks promising.

```bash
mergic make RLdata500.csv 0.12
```

We can make a grouping with that cutoff, and the result is a JSON-formatted partition.

```json
{
    "MATTHIAS,,HAAS,,1955,7,8": [
        "MATTHIAS,,HAAS,,1955,7,8",
        "MATTHIAS,,HAAS,,1955,8,8"
    ],
    "HELGA,ELFRIEDE,BERGER,,1989,1,18": [
        "HELGA,ELFRIEDE,BERGER,,1989,1,18",
        "HELGA,ELFRIEDE,BERGER,,1989,1,28"
    ],
```

In this example, the partition at a cutoff of 0.12 happens to be exactly right and we correctly group everything. (This says something about how realistic this example data set is, something about your tool of choice if it can't easily get perfect performance on this example data set, and also something about information leakage.)

```json
{
    "MATTHIAS,,HAAS,,1955,7,8": [
        "MATTHIAS,,HAAS,,1955,8,8"
    ],
    "HELGA,ELFRIEDE,BERGER,,1989,1,18": [
        "MATTHIAS,,HAAS,,1955,7,8",
        "HELGA,ELFRIEDE,BERGER,,1989,1,18",
        "HELGA,ELFRIEDE,BERGER,,1989,1,28"
    ],
```

The above would be a strange change to make, but you could make such a change and save your changed version as a new file.

```bash
mergic diff base.json edited.json > diff.json
mergic apply base.json diff.json
```

`mergic` includes functionality for creating and applying diffs that compare two partitions. You can preserve just the changes that you make by hand, which provides a record of the changes that had a human in the loop versus the changes that were computer-generated.

```bash
mergic table edited.json
```

To actually accomplish the desired merge or deduplication after creating a good grouping in JSON, `mergic` will generate a two-column merge table in CSV that can be used with most any data system.

```
"HANS,,SCHAEFER,,2003,6,22","HANS,,SCHAEFER,,2003,6,22"
"HARTMHUT,,HOFFMSNN,,1929,12,29","HARTMHUT,,HOFFMSNN,,1929,12,29"
"HARTMUT,,HOFFMANN,,1929,12,29","HARTMHUT,,HOFFMSNN,,1929,12,29"
```

These merge tables are awful to work with by hand, which is why `mergic` leaves their generation as a final step after humans work with the more understandable JSON groupings.


-----

<img width="1000%" title="custom distance function documentation on GitHub" src="custom_distance.png" />

-----

It's easy to write a script with a custom distance function and immediately use it with all the workflow support of the `mergic` script.

Often, a custom distance function makes or breaks your effort. It's worth thinking about and experimenting with, and `mergic` makes it easy!


-----

<img width="1000%" title="New York Open Statistical Programming Meetup; Practical Mergic: How to Join Anything" src="open_stats_prog_meetup.png" />

-----

If you're interested in this kind of thing, I'll be doing [a longer talk](http://www.meetup.com/nyhackr/events/222328498/) at the [New York City Open Statistical Programming Meetup](http://www.meetup.com/nyhackr/) next week Wednesday.


-----

[<img width="1000%" title="Open Data Science Conference" src="open_data_sci_con.png" />](http://opendatascicon.com/)

-----

words


-----

Thanks!

-----

words
