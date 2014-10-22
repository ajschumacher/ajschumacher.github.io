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

(If you're interested in self-contained HTML, I have a related [Python](https://www.python.org/) [package](https://pypi.python.org/pypi/selfcontain/) on [PyPI](https://pypi.python.org/) called [selfcontain](https://github.com/ajschumacher/selfcontain).)

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

[CSV](http://en.wikipedia.org/wiki/Comma-separated_values) is generally much more compact, and the simple table layout is very familiar. There's even less data type information than with JSON, but that generally isn't such a big deal. D3 is still happy to read CSV. So CSV is a good way to save bytes over JSON arrays of objects. But can we do better?

-----

```nohighlight
name,height2014,weight2014
Aaron,68,70
...
```

-----

We could change the structure of the CSV data. Moving to a wider format might save bytes, as we don't repeat the year for every record. Of course this violates the rules of [tidy data](http://vita.had.co.nz/papers/tidy-data.pdf) and can be difficult to work with.

-----

```nohighlight
name,year,thing,value
Aaron,2014,height,68
Aaron,2014,weight,70
...
```

-----

We could move in the other direction, toward a longer format. Now there's only one column with values in it. We might object that the values now have presumably varying units, but we haven't been very concerned with units so far. For compactness though, we're clearly losing by duplicating names and years and things. If only there were a way to arrange the data so that nothing is repeated!

(For most wide-to-long and long-to-wide conversions, use the [gather](http://rpackages.ianhowson.com/cran/tidyr/man/gather.html) and [spread](http://rpackages.ianhowson.com/cran/tidyr/man/spread.html) functions from the [tidyr](https://github.com/hadley/tidyr) package.)

-----

![cube](cube.png)

-----

One solution to this problem is the data cube.

([Image](http://commons.wikimedia.org/wiki/File:Necker_cube.svg) ([1000-pixel PNG](http://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Necker_cube.svg/1000px-Necker_cube.svg.png))from [Wikimedia Commons](http://commons.wikimedia.org/)).)

-----

```json
{"people stats": {
  "value": [68, 70, ...],
  "dimension": {
    "id": ["name", "year", "thing"],
    ...
```

-----

This is JSON-stat.

-----

Xavier Badosa

-----

Swedish Inflation Calculator
http://bl.ocks.org/badosa/20735ba5bbecbc079d78

Lars Pedersen (statistics Greenland)
http://www.scb.se/sv_/PC-Axis/Programs/PX-Web/PX-Web-examples/

-----

![](bus.png)

-----

http://agendadirectaonline.com/wp-content/uploads/2012/06/Bus-up-to-55-pax..png


https://github.com/ajschumacher/rjstat

Once it was up on GitHub, anybody could come and mess with it. And somebody did.

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
