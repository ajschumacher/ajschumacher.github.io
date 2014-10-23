# JSON-stat and rjstat

*A [lightning talk](http://www.meetup.com/stats-prog-dc/events/177772502/) for [Statistical Programming DC](http://www.meetup.com/stats-prog-dc/).*

[JSON-stat](http://json-stat.org/) is a [JSON](http://json.org/) [data cube](http://en.wikipedia.org/wiki/Data_cube) packaging format. [rjstat](https://github.com/ajschumacher/rjstat) is an [R](http://www.r-project.org/) package for reading and writing JSON-stat.

-----

```html
<!doctype html>
<html>
  <head>
    <title>data?</title>
...
```

-----

About a year ago I was thinking about how to put a lot of data into a self-contained [HTML](http://en.wikipedia.org/wiki/HTML) document. Presuming something text-based, what's the most compact way to store the data?

*If you're interested in self-contained HTML, I have a related [Python](https://www.python.org/) [package](https://pypi.python.org/pypi/selfcontain/) on [PyPI](https://pypi.python.org/) called [selfcontain](https://github.com/ajschumacher/selfcontain).*

-----

```json
[{"name": "Aaron",
  "year": 2014,
  "height": 68,
  "weight": 70},
...
```

-----

It's pretty common online to see data as an array of objects in JSON. [D3](http://d3js.org/) is happy to use this, for example. And it's good if you need to have every observation stand on its own, or if there's no consistent schema. But for every record you're repeating all the keys, so it isn't very compact.

-----

```nohighlight
name,year,height,weight
Aaron,2014,68,70
...
```

-----

[CSV](http://en.wikipedia.org/wiki/Comma-separated_values) is generally much more compact, and the simple table layout is very familiar. There's less data type information than even JSON, but that generally isn't such a big deal. D3 is still happy to read CSV. So CSV is a good way to save bytes over JSON arrays of objects. But we're still going to repeat names and years a lot. Can we do better?

-----

```nohighlight
name,height2014,weight2014
Aaron,68,70
...
```

-----

We could change the structure of the CSV data. Moving to a wider format might save bytes, as we don't repeat the year for every record. Of course this violates the rules of [tidy data](http://vita.had.co.nz/papers/tidy-data.pdf) and can be difficult to work with. This is not the direction we want to go.

-----

```nohighlight
name,year,thing,value
Aaron,2014,height,68
Aaron,2014,weight,70
...
```

-----

We could move in the other direction, toward a longer format. Now there's only one column with values in it. We might object that the values now have presumably varying units, but we haven't been very concerned with units so far. For compactness though, we're clearly losing by duplicating names and years and things. If only there were a way to arrange the data so that nothing is repeated!

(For most wide-to-long and long-to-wide conversions in R, use the [gather](http://rpackages.ianhowson.com/cran/tidyr/man/gather.html) and [spread](http://rpackages.ianhowson.com/cran/tidyr/man/spread.html) functions from the [tidyr](https://github.com/hadley/tidyr) package.)

-----

![cube](cube.png)

-----

One solution to this problem is the data cube approach. The values fill the volume of the cube. All the other columns define dimensions, and we track single copies of the dimensions. This is compact, and if you're careful you might get benefits of [striding](http://en.wikipedia.org/wiki/Stride_of_an_array).

*[Image](http://commons.wikimedia.org/wiki/File:Necker_cube.svg) ([1000-pixel PNG](http://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Necker_cube.svg/1000px-Necker_cube.svg.png))from [Wikimedia Commons](http://commons.wikimedia.org/).*

-----

```json
{"people stats": {
  "value": [68, 70, ...],
  "dimension": {
    "id": ["name", "year", "thing"],
    ...
```

-----

So this is what JSON-stat looks like. There's more to it, and certainly a little bit of overhead in specifying everything in an unambiguous way, but with large data sets you can get significant savings in size. And that's not all.

-----

meta

-----

It stores metadata!

-----

Xavier Badosa

-----

Swedish Inflation Calculator
http://bl.ocks.org/badosa/20735ba5bbecbc079d78

Lars Pedersen (statistics Greenland)
http://www.scb.se/sv_/PC-Axis/Programs/PX-Web/PX-Web-examples/

So that's what JSON-stat is.

-----

![bus](bus.png)

-----

I was using R a lot at the time, and I found that there wasn't anything to read and write JSON-stat. So when I visited New York one weekend, I spent some of my bus time hacking an R package together, following the advice in [Advanced R](http://adv-r.had.co.nz/). I got something that worked, put it [up on GitHub](https://github.com/ajschumacher/rjstat), and told Xavier about it.

It turned out I didn't need JSON-stat, and I immediately forgot about it. But once it was up on GitHub, anybody could come and mess with it. And somebody did.

*It isn't quite true that I immediately forgot about it. I also did a lightning talk at [Hack and Tell](http://dc.hackandtell.org/2013/11/21/round-3.html).*

*Image from [some site](http://agendadirectaonline.com/wp-content/uploads/2012/06/Bus-up-to-55-pax..png).*

-----

Håkon Malmedal

-----

I don't know how recent this picture is.

https://twitter.com/hmalmedal

-----

CRAN

-----

http://cran.r-project.org/submit.html

approved by Uwe Ligges

now available via the [Comprehensive R Archive Network](http://cran.r-project.org/) (CRAN).

-----

Travis

-----

It's so easy and fun!

-----

tweet from Hadley

-----

So cool!
