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
person,height2014,weight2014
Aaron,68,70
...
```

-----

Something about CSV. Example is more compact, but at some cost in goodness...
(Maybe switch the order between this and next?)

-----

```
person,year,height,weight
Aaron,2014,68,70
...
```

-----

Now we've achieved tidy data...

-----

```
person,year,thing,value
Aaron,2014,height,68
Aaron,2014,weight,70
...
```

-----

Now this is fully reduced: what you need/get with `rjstat`. But: so much duplication!
