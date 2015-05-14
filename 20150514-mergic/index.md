# mergic

*A lightning talk at the [May meeting](http://www.meetup.com/PyDataNYC/events/222329250/) ([registration](http://www.bloomberg.com/event-registration/?id=39288)) of the [PyData NYC meetup group](http://www.meetup.com/PyDataNYC/), introducing [mergic](https://github.com/ajschumacher/mergic).*

-----

<center>
planspace.org

@planarrowspace
</center>

-----

text


-----

<img height="1000%" title="ermahgerd mergic" src="ermahgerd.png" />

-----

ermahgerd


-----

workflow support for reproducible deduplication and merging

-----

words


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

words


-----

<img width="1000%" title="big data" src="big_data.png" />

-----

big data


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

words


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

words about dedupe


-----

```
Karolina Pliskova,K Pliskova
```
-----

words


-----

```
Kristyna Pliskova,K Pliskova
```
-----

words


-----

sets > pairs

-----

words


-----

<img width="1000%" title="Open Refine" src="open_refine.png" />

-----

Open Refine


-----

 * simple
 * customizable
 * reproducible

-----

goals


-----

demo

-----

```bash
pew new pydata
```

```bash
pip install mergic
```

```bash
mergic -h
```

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

```bash
head -4 RLdata500.csv
```

```
CARSTEN,,MEIER,,1949,7,22
GERD,,BAUER,,1968,7,27
ROBERT,,HARTMANN,,1930,4,30
STEFAN,,WOLFF,,1957,9,2
```

```bash
mergic calc RLdata500.csv
```

```
num groups, max group, num pairs, cutoff
----------------------------------------
       500,         1,         0, -0.982456140351
       497,         2,         3, 0.0175438596491
```

```
         2,       499,    124251, 0.416666666667
         1,       500,    124750, 0.418181818182
```

```
       451,         2,        49, 0.111111111111
       450,         2,        50, 0.115384615385
       449,         3,        52, 0.125
```

```bash
mergic make RLdata500.csv 0.12
```

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

```bash
mergic diff base.json edited.json > diff.json
mergic apply base.json diff.json
```

```bash
mergic table edited.json
```

```
"HANS,,SCHAEFER,,2003,6,22","HANS,,SCHAEFER,,2003,6,22"
"HARTMHUT,,HOFFMSNN,,1929,12,29","HARTMHUT,,HOFFMSNN,,1929,12,29"
"HARTMUT,,HOFFMANN,,1929,12,29","HARTMHUT,,HOFFMSNN,,1929,12,29"
```

words


-----

<img width="1000%" title="custom distance function documentation on GitHub" src="custom_distance.png" />

-----

custom distance


-----

[<img width="1000%" title="New York Open Statistical Programming Meetup; Practical Mergic: How to Join Anything" src="open_stats_prog_meetup.png" />](http://www.meetup.com/nyhackr/events/222328498/)

-----

words


-----

[<img width="1000%" title="Open Data Science Conference" src="open_data_sci_con.png" />](http://opendatascicon.com/)

-----

words


-----

Thanks!

-----

words
