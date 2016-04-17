# Equivalences between Tables, Maps, Graphs, and Sets

By _tables_, I mean the relational database or well-used spreadsheet
system of data in rectangular grids of rows and columns.

```
| property_a  | property_b  |
|-------------|-------------|
| value_a_one | value_b_one |
| value_a_two | value_b_two |
```

By _maps_, I mean data in [map][] data structures. Maps are also known
as associative arrays or dictionaries. In JavaScript they're called
objects, and JavaScript Object Notation ([JSON][]) is a common format.

[map]: https://en.wikipedia.org/wiki/Associative_array
[JSON]: https://en.wikipedia.org/wiki/JSON

```
[{property_a: value_a_one, property_b: value_b_one},
 {property_a: value_a_two, property_b: value_b_two}]
```

By _graphs_, I mean nodes connected by edges. [RDF][], for example,
has labels for both nodes and edges. One representation is _triples_
of the form `subject, predicate, object`, where `subject` and `object`
are nodes, and `predicate` is an edge.

[RDF]: https://www.w3.org/RDF/

```
id_one, property_a, value_a_one
id_one, property_b, value_b_one
id_two, property_a, value_a_two
id_two, property_b, value_b_two
```

A visual for this _triple graph_ shows two components.

![graph of triple data](triple_graph.png)

Graphs can also have unlabeled edges, in which case one representation
is _doubles_ of the form `subject, object`.

```
id_one, id_a_one
id_a_one, property_a
id_a_one, value_a_one
id_one, id_b_one
id_b_one, property_b
id_b_one, value_b_one
id_two, id_a_two
id_a_two, property_a
id_a_two, value_a_two
id_two, id_b_two
id_b_two, property_b
id_b_two, value_b_two
```

A visual for one component of this _double graph_ shows how the
additional identity nodes expand the representation.

![graph of double data](double_graph.png)

In this formulation, with non-identity nodes always leaf nodes, double
graphs are equivalent to [sets][].

[sets]: https://en.wikipedia.org/wiki/Set_(abstract_data_type)

```
[{{property_a, value_a_one}, {property_b, value_b_one}},
 {{property_a, value_a_two}, {property_b, value_b_two}}]
```

There are a lot of close equivalences:

 * sets are mostly equivalent to double graphs
 * maps are mostly equivalent to triple graphs
 * tables and the above are all mostly equivalent

http://konklone.io/json/
https://github.com/ajschumacher/dd

---

Some considerations argue against the primacy of two-dimensional data
tables, and some of these concerns are valid, but it is not
insignificant that spreadsheet interfaces seem to work pretty well for
a lot of humans, and probably even if relying on a different
underlying structure tables should remain as an interface.

One complaint about spreadsheets in particular, though relational
databases are not necessarily much better, is that people can and do
choose layouts for their data that other people find appalling.

Proponents of "data cubes" might also suggest that two dimensions is
not enough for some types of data.

Wickham's [Tidy Data][] paper provides responses to both of these
objections. In the first place, a wide range of table layouts are
equivalent and can be converted to a standard "tidy" format when
needed. There is no fundamental need to impose any given format in the
name of aesthetics. In the second place, an arbitrary number of
dimensions can be represented perfectly well in a two-dimensional
table, though such a representation may not be ideal for human users.
There remains a question of how to provide a good interface.

[Tidy Data]: http://vita.had.co.nz/papers/tidy-data.pdf

It is awkward in a flat table to represent things that have multiple
values. For example, with one row per song and one "artist" field,
what do you do for a song that has two artists?

You might want to create a "second artist" field, which could be a
solution to a different problem. What we really want is to have two
entries each "in the same place" in the data.

Whatever the solution, there is a related interface issue: especially
with a tabular display, how do we show the user that there are two
values?

A technique common in relational databases hacks a graph approach into
the tabular approach. It uses a table for songs, a table for artists,
and a third table of "edges" connecting songs and artists together.
This means you have to know about a lot of the tables' design, it's
overkill when the songs and artists are really just strings, and
there's definitely not an obvious solution to the interface problem.

You might want to use composite data types: instead of storing one
simple value in the song-artist position, storing, for example, a list
of values. This could be done with relational databases or
spreadsheets, but it generally isn't done. It is easy to do with
[pandas data frames][] or in JSON.

[pandas data frames]: http://pandas.pydata.org/pandas-docs/stable/generated/pandas.DataFrame.html

Composite data values are probably worth having for some use cases.
This comes with a new interface issue, distinct from the issue of an
interface for multiple values. And it isn't a good solution to the
original problem of allowing multiple values. Aside from lists in
particular being ordered, there is a difference between something
having multiple values, and something being one list.

Composite data like lists also introduce complexity that could be
avoided. It is easy and natural with triple graphs (though not maps)
to represent multiple values.

```
id_song_one, artist, a_jazz_band
id_song_one, artist, a_jazz_singer
```


Spreadsheets are not relational databases. Products like Excel
implement a kind of discrete Cartesian quarter-plane within which
simple data types can be placed. The spacial nature of the spreadsheet
supports calculations like "add the value to the left of this one to
the value three above".

A spreadsheet user may be thinking of tables, and some software
functionality may support this, but for the most part structure in
spreadsheets is hallucinated by the user. It is a testament to human
abilities, combining remarkable gestalt perception with careful
attention to detail, that anything useful is ever accomplished with
spreadsheets.

Longer discussion here.

... Many common ways of organizing data differ only in which
identities they make explicit. ...

In double graph form, there is nothing to distinguish properties from
values.

Something about lists as values / the flexibility of more data types
in some languages...

http://planspace.org/2014/04/05/data-done-wrong-the-only-most-recent-data-model/
http://planspace.org/2012/06/27/doubles-are-sufficient-for-all-data/


---

For all the graphs here, I'm not considering duplicate edges.

I made the graph diagrams with [draw.io](https://www.draw.io/).
