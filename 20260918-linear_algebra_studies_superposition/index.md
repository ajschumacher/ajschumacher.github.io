# Linear Algebra is the math of superposition


If math is about patterns, what patterns is Linear Algebra about?
Using the word “linear” again feels circular, and still leaves us
needing a special definition. Let's borrow “superposition,” as it's
used in physics and engineering, to name the patterns of Linear
Algebra.


## A beautiful pattern

![flowers](flowers.png)

Emmy started growing flowers at home, using special lights and soil.
She keeps all the flowers she grows, pressing them inside a large book
to preserve them. When she remembers, at the end of the month she
records the number of flowers she's grown since she started.

```python
| at end of month | total flowers grown |
|-----------------|---------------------|
| 3               | 6                   |
| 5               | 10                  |
| 7               | 14                  |
```

If things keep going this way, how many flowers will Emmy have after
twelve months? How many ways can you find the answer?


### Method one: Multiply month three by four

Twelve is four times three. At the end of month three, there were six
flowers. Multiply six by four and get 24 flowers at the end of month
twelve.

<!--
_Terminology:_ This method multiplies the month and flower count by a
number, called a _scalar._ Patterns where this works are called
_homogeneous._
-->


### Method two: Add months five and seven

Twelve is five plus seven. At the end of month five there were 10
flowers, and at the end of month seven there were 14. Add 10 and 14
and get 24 flowers at the end of month twelve.

<!--
_Terminology:_ This method adds months together and adds flower counts
together. Patterns where this works are called _additive._
-->


### Method three: Multiply twelve by two

The number of flowers is always double the month number. Multiply
twelve by two and get 24 flowers at the end of month twelve.

That multiplier, two, goes by many names. In this case it is a
_singular value_ and arguably also an _eigenvalue_—though these are
not always the same, and there's more to say. <!-- Draw a graph and
you might also call it a _slope_ or a _derivative._ (This should
probably go in a follow-up that gets into it...) -->

<!--
_Terminology:_ This method finds a _singular value_ that here can
directly multiply the number of months to get the number of flowers.
The singular value is also an _eigenvalue_ here.
-->


<!--
### Method four: Extend from the seventh month

Going from month five to month seven increases the number of flowers
by four, so every month the number of flowers goes up by two. Starting
at 14 flowers after month seven, increase the number of flowers by two
for each of five more months to get 24 flowers at the end of month
twelve.

_Terminology:_ The change in flowers for one month is called a
_slope,_ especially when the pattern is drawn as a graph.
-->


## Superposition

When these methods work, the pattern satisfies _superposition._
Superposition refers to putting multiple things “in the same place,”
adding them up. In a somewhat special sense of _linear,_ a system with
superposition is also called _linear._ It might be best to think of
_linear_ as short for _linear superposition._ Linear Algebra is the
mathematics of superposition, the mathematics of linear systems in
this sense.

Superposition is usually defined based on method one (multiplying by a
number works) and method two (adding things together works). Method
three follows from those two. Much of Linear Algebra is about
extending method three to more complicated cases.

You may have noticed that many patterns _don't_ appear to follow
superposition. Why does Linear Algebra focus on such simple patterns?

One reason is that by keeping the patterns simple in this way, it's
possible to make them more complex in another way: by adding
dimensions. Linear Algebra extends to many dimensions, becoming the
math of data.

Another reason is that although the rules of linear superposition seem
like a strong constraint on patterns, lots of complex patterns can
still be represented or at least approximated.


<!--

Further ideas:

 * Modeling: Think about ways our “linear model” of the flowers could
   fail.
 * Graphing: Draw a picture of the pattern. Draw some non-linear
   patterns.

-->
