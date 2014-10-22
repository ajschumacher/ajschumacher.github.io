# JSON-stat and rjstat

<center>*A [lightning talk](http://www.meetup.com/stats-prog-dc/events/177772502/) for [Statistical Programming DC](http://www.meetup.com/stats-prog-dc/).*</center>

[JSON-stat](http://json-stat.org/) is a [JSON](http://json.org/) data packaging format. [rjstat](https://github.com/ajschumacher/rjstat) is an [R](http://www.r-project.org/) package for reading and writing JSON-stat.

Even if you never need other, I hope that the ideas and process I describe will be interesting.

-----

```
<!doctype html>
<html>
  <head>
    <title>data?</title>
...
```

-----

About a year ago I was thinking about how to put a lot of data into a completely self-contained [HTML](http://en.wikipedia.org/wiki/HTML) document. Presuming something text-based, what's the most compact way to store the data?

(If you're interested in self-contained HTML, I have a related [Python](https://www.python.org/) [package](https://pypi.python.org/pypi/selfcontain/) on [PyPI](https://pypi.python.org/) called [selfcontain](https://github.com/ajschumacher/selfcontain).)

-----

```
[{"person": "Aaron",
  "year": 2014,
  "height": 68,
  "weight": 70},
...
```

-----

It's pretty common online to see data as a list of objects in JSON. [D3](http://d3js.org/) is happy to use this, for instance. And it's good if you need to have every observation stand on its own, or variable schema. But for every record you're repeating all the keys, so it isn't very compact.

-----

```
person,year,height,weight
Aaron,2014,68,70
...
```

-----

Something about CSV. Good if don't need every line to stand on its own.

-----

```
person,height2014,weight2014
Aaron,68,70
...
```

-----

Example is more compact, but at some cost in goodness... (Not tidy.)

-----

```
person,year,thing,value
Aaron,2014,height,68
Aaron,2014,weight,70
...
```

-----

Now this is fully reduced: what you need/get with `rjstat`. But: so much duplication! And numbers with different meanings in the same column!

use `spread` function from `tidyr` if more than one variable in value column

-----

```
person,year,height
Aaron,2014,68
...

person,year,weight
Aaron,2014,70
...
```

-----

Could also split into multiple tables. "Goal" is to get single value column. Why?

-----

![cube](cube.png)

-----

([Image](http://commons.wikimedia.org/wiki/File:Necker_cube.svg) ([1000-pixel PNG](http://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Necker_cube.svg/1000px-Necker_cube.svg.png))from [Wikimedia Commons](http://commons.wikimedia.org/)).)

For data cubes!

Xavier Badosa

Swedish Inflation Calculator
http://bl.ocks.org/badosa/20735ba5bbecbc079d78

Lars Pedersen (statistics Greenland)
http://www.scb.se/sv_/PC-Axis/Programs/PX-Web/PX-Web-examples/

-----

![](bus.png)

-----

http://agendadirectaonline.com/wp-content/uploads/2012/06/Bus-up-to-55-pax..png


https://github.com/ajschumacher/rjstat

Håkon Malmedal
https://twitter.com/hmalmedal

-----

CRAN

-----

http://cran.r-project.org/submit.html

approved by Uwe Ligges

now available via the [Comprehensive R Archive Network](http://cran.r-project.org/) (CRAN).
