# All of Linear Algebra in Five Minutes


I volunteered to give a talk on Linear Algebra at a [Data Science
DC][] lightning talks [event][]. The [video][] is on YouTube now. The
full [deck][] is also available. It's challenging to present all of
Linear Algebra in five minutes. I hope it's fun!

[Data Science DC]: https://www.dc2.org/data-science-dc
[event]: https://luma.com/4f5wo210?tk=5w7yVa
[video]: https://youtu.be/NWuTKS8ikB0
[deck]: https://docs.google.com/presentation/d/1Ocew-wu96B0Rv-Rb3Vtio1Wmv9ezHMdaC_sP38muk1I/edit


---

### Script

This won't make a lot of sense without the slides; check out the
[deck][], where the script is all in the speaker notes. (I wrote and
edited it in here originally though, so I might as well keep it, I
figure.)

It arguably _still_ doesn't make enough sense _with_ the slides,
because of (among other possible reasons) the constraints of fitting
into a five minute presentation. I am working on more complete
explanations; see [Linear Algebra project][].

[Linear Algebra project]: /20260730-linear_algebra_project/


---

If math is about patterns, what patterns is Linear Algebra about?


---

Well, patterns like this: linear ones.

What does that mean?


---

It means we can add existing entries.


---

And we can also multiply existing entries.


---

Notice the pattern: times two.

We'll call that two a “singular value” and also an “eigenvalue” here.


---

In one dimension, this is really all we can do.


---

Proof.


---

So what is this?


---

Multiplication _emits_ multiples, but it also _detects_, like a
measuring stick with different units.


---

And you can go either way, to the right or the left, and each is the
inverse of the other. Two is “invertible.”


---

The unit, one, is sort of special, just sort of cosigning whatever you
already had.


---

But zero sends everything to a single value. Zero is singular. There's
no inverse, “you can't divide by zero.”


---

Negative numbers work fine though.


---

Or we can separate the size from the sign, and get the singular value
decomposition of negative two.


---

Then it's the usual positive multiplication of lengths, and for the
signs, either they cosign or they don't.


---

Also now we have _two_ unit measuring sticks.


---

What if we have two inputs and one output? All we can do is this.


---

Proof.


---

We'll also call this kind of thing a dot product.

Let's write it differently.


---

We'll put the _a_ and _b_ next to each other.


---

And we'll call that a row.


---

And to be consistent with function notation, we'll say the two inputs
come on the right.


---

So the inputs have to come like this.


---

So we better write them like this.


---

And we'll call that a column.


---

The choice of writing it this way is arbitrary, so it deserves a
mnemonic.


---

“Rows reach right, columns lean left.”


---

Now this is all lined up like a pipeline. If we _flip_ that
pipeline...


---

It has to come out like this, with rows and columns _transposed_.


---

Okay, call this guy a vector. How long is it? Maybe you know the
Pythagorean theorem?


---

Proof.


---

The square root isn't linear, but we can use it to rewrite things. We
get essentially the singular value decomposition of a vector: a length
times a unit direction. This is basically polar coordinates.


---

All the 2D unit vectors make this circle. And all of them are great
measuring sticks.


---

They measure how long a vector is, _in their direction._ For two unit
vectors, that's no-kidding cosine. It's always invariant to rotation.


---

Proof.


---

When things are perpendicular, the dot product and the cosine are
zero.


---

So vectors are detectors and emitters.

---

Here's a unit vector.


---

It measures a vector coming on the right.


---

Or it emits a multiple of itself.


---

A column is just the transpose.


---

It measures a vector coming on the left.


---

Or it emits a multiple of itself. (This is the one that 3Blue1Brown
focuses on.)


---

Let's do multiple inputs and multiple outputs.


---

Here's an orthogonal matrix, perpendicular unit vectors, a rotation
matrix. On the left, it detects along the row directions and emits
along the column directions.


---

The transpose does the opposite, so it's the inverse.


---

And we already did inverses for diagonal matrices.


---

There might be some zeros.


---

At last we have the full Singular Value Decomposition, SVD, the
Fundamental Theorem of Linear Algebra! Every matrix can be written
like this!

Notice rows on the right, columns on the left.


---

That's also PCA, by the way. [Principal Components Analysis]


---

And you already know how to invert an SVD, or get close.


---

So you can solve equations like this. But use a computer.

And it won't work if the matrix is singular.


---

You can always get some sort of solution like this. And that's linear
regression.


---

Data though. Kids rated foods.


---

It's nice to subtract out the means.

Maybe you can see there's only one singular value, and we could do
dimensionality reduction.


---

Measure columns by columns, you get sums of squares, a multiple of a
covariance matrix.


---

Or, let's make the rows unit length.


---

And measure rows by rows. These are cosines, aka Pearson's correlation
coefficients.

These Gram matrices are always square. People really like square
matrices.


---

With a square matrix, you can find eigenvectors that just get
stretched by an eigenvalue, without changing direction. Maybe you can
diagonalize a matrix.

This lets you do fun stuff like getting the closed form for the nth
Fibonacci number.


---

And that's about it! Thanks!
