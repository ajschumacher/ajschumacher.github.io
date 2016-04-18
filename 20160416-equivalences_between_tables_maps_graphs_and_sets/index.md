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

---

Tabular data can be converted to map data. For example, with
[Python][]'s [pandas data frames][] this is as easy as
`dataframe.to_json()`.

[Python]: https://www.python.org/
[pandas data frames]: http://pandas.pydata.org/pandas-docs/stable/generated/pandas.DataFrame.html

Often maps can be complex in ways that don't map immediately to
tabular data, but still it's often possible for example to
[convert JSON to CSV][].

[convert JSON to CSV]: http://konklone.io/json/

Graphs often work with doubles or triples directly as a storage or
representation format.

Automatically converting tabular or map data to/from triples is less
common. I have a little toy [data diff][] code that does a simple
version of this. I think some parts of [datomic][]'s internals do
related conversions.

[data diff]: https://github.com/ajschumacher/dd
[datomic]: http://www.datomic.com/

Doubles are interesting but I don't know of any automatic converters
to or from other formats.

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
equivalent and can be converted to a standard "tidy" format if needed.
There is no fundamental need to impose any given format in the name of
aesthetics. In the second place, an arbitrary number of dimensions can
be represented in a two-dimensional table, though such a
representation may not be ideal for human users. There remains a
question of how to provide a good interface.

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
the tabular framework. It uses one table for songs, one table for
artists, and a third table of "edges" connecting songs and artists
together. This means you have to know about a lot of the tables'
design. It can seem like overkill when the songs and artists are
really just strings. And there's not an obvious solution to the
interface problem.

You might want to use composite data types: instead of storing one
simple value in the song-artist position, for example, store a list of
values. This could be done with relational databases or spreadsheets,
but it generally isn't done. It is easy to do with pandas data frames
or in JSON.

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

The other side of multiple values is missing values. Tables, when
realized as such, are "dense", meaning they have something at every
intersection of row and column. Since we don't always have a value, a
database might use `NULL`, or there could be special values like `NA`
in [R][]. With triple graphs (and maps) these aren't necessary as you
always have a choice to not include a triple. Triples are naturally
"sparse" for missing data (distinct from sparsity for zeros).

[R]: https://www.r-project.org/

```
| property_a  | property_b  |
|-------------|-------------|
| value_a_one | NULL        |
| NULL        | value_b_two |
```

```
[{property_a: value_a_one},
 {property_b: value_b_two}]
```

```
id_one, property_a, value_a_one
id_two, property_b, value_b_two
```

Spreadsheets are not relational databases. Products like Excel
implement a kind of discrete Cartesian quarter-plane within which
simple data types can be placed. The spacial nature of the spreadsheet
supports calculations like "add the value to the left of this one to
the value three above" and having multiple tables "next to" one
another.

A spreadsheet user may be thinking of tables, and some software
functionality may support this, but for the most part structure in
spreadsheets is hallucinated by the user. It is a testament to human
abilities, combining remarkable gestalt perception with careful
attention to detail, that anything useful is ever accomplished with
spreadsheets.

It seems like giving spreadsheet software well-defined tables rather
than vast expanses of empty cells would be a change worth making. Some
tools, such as [editdata][], do this.

[editdata]: http://app.editdata.org/

It's awkward for people to think about things without physical
metaphor. Set literals have to be written in some order, for example,
despite not having any order intrinsically. In the same way, tables
have spacial baggage. Columns are always next to one another. Rows are
before or after one another.

If you change the order of rows or columns, there is some change, but
it isn't a very big change.

```
| property_a  | property_b  |
|-------------|-------------|
| value_a_one | value_b_one |
| value_a_two | value_b_two |
```

```
| property_b  | property_a  |
|-------------|-------------|
| value_b_one | value_a_one |
| value_b_two | value_a_two |
```

If you diff CSV files after re-ordering columns, every line of the
file has changed. But in some sense the data hasn't changed at all.

I think the right way to conceptualize this is to see even a simple
CSV file as a view of an underlying data set. While we usually don't
make it explicit, the ordering of columns and rows is characteristic
of the view and not the data.

With both tables and maps, sometimes the order of things has meaning
that should really be in another field.

Separate though sometimes conflated with ordering is the idea of a
unique identity for each row or map. By their distinctness they have
an implicit identity separate from any values.

Especially when you're interested in comparing two versions of a data
set, having an ID for each "row" is important. Otherwise you're in the
fraught position of having to determine what changed and what was
supposed to be the same, at the same time. This is impossible for at
least some changes.

The [dat project][] beta, for example, had an import `-key` option
(see [beta docs][]). The default behavior though was to automatically
generate a unique ID, which is also what [MongoDB][] does by default.

[dat project]: http://dat-data.com/
[beta docs]: https://github.com/maxogden/dat/blob/dd984adaa57c35fa08cd2c315e22186378d6f928/docs/cli-docs.md
[MongoDB]: https://www.mongodb.com/

When specifying IDs by hand it is tempting to make choices that turn
out to be bad, like using a name as an ID and finding later both that
names can change and multiple things can have the same name.

Once there are unique IDs for rows/maps, comparison between versions
easily discovers which have been added and removed, and those that
remain can be compared to their partners.

Doubles and sets as a data representation are interesting but may not
be very useful. There is nothing to distinguish properties from
values. It could probably still be worked out by finding patterns of
value occurrences, but this would be expensive along the same lines as
matching up rows without IDs. It is a little poetic to think about
expressing things like `{smell, roses, raindrops}` but in the end the
sets and doubles don't directly convey all the same information as the
other formats. A while ago I thought that doubles [were sufficient][],
but I no longer think so.

[were sufficient]: http://planspace.org/2012/06/27/doubles-are-sufficient-for-all-data/

My main interest in all this is dealing with the problem of versioning
data. Often, only the most recent version of data is available or even
stored anywhere, which [I don't like][].

[I don't like]: http://planspace.org/2014/04/05/data-done-wrong-the-only-most-recent-data-model/

---

For all the graphs here, I'm not considering duplicate edges.

I made the graph diagrams with [draw.io](https://www.draw.io/).
