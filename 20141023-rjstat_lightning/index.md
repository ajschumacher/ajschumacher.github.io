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

Motivation for wanting to do this...

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

Now this is fully reduced: what you need/get with `rjstat`. But: so much duplication!
