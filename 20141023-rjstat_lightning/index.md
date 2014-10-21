# JSON-stat and rjstat

A lightning talk at [Statistical Programming DC](http://www.meetup.com/stats-prog-dc/)'s [event](http://www.meetup.com/stats-prog-dc/events/177772502/).

-----

```
<!doctype html>
<html>
  <head>
    <title>data?</title>
...
```

-----

Motivation for wanting to do this... Mention `selfcontain` (https://github.com/ajschumacher/selfcontain and/or https://pypi.python.org/pypi/selfcontain/) either here or later...

-----

```
[{"person": "Aaron",
  "year": 2014,
  "height": 68,
  "weight": 70},
...
```

-----

Something about JSON...

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

data cube

-----

For data cubes!

Xavier Badosa

Swedish Inflation Calculator
http://bl.ocks.org/badosa/20735ba5bbecbc079d78

-----

bus

-----

maybe this bus?
http://3.bp.blogspot.com/-_V8_WYHo078/UjEgx5zHpGI/AAAAAAAAAS0/b_jOKfwKgEQ/s1600/DC2NY3.jpg

https://twitter.com/hmalmedal

-----

CRAN

-----

http://cran.r-project.org/submit.html

approved by Uwe Ligges
