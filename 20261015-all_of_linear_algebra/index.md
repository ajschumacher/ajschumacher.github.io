# All of Linear Algebra


[Deck](https://docs.google.com/presentation/d/1Ocew-wu96B0Rv-Rb3Vtio1Wmv9ezHMdaC_sP38muk1I/edit)


---

If math is about patterns, what patterns is Linear Algebra about?


---

Linear patterns, like this one!

Let's fill in the gap.


---

We can add existing entries.


---

We can also multiply existing entries.


---

And there's a pattern: times two.

That two is a “singular value” and also an “eigenvalue” here.


---

So we're always just multiplying by a number! That's all we can do!


---

Proof.


---

And this is a college course?


---

Well what is multiplying? It's a little like a measuring stick with
different units on either side.


---

And you can go either way, to the right or the left, and each is the
inverse of the other. Two is “invertible.”


---

But zero sends everything to a single value. Zero is singular. There's
no inverse, “you can't divide by zero.”


---

Negative numbers work fine though.


---

Or we can separate the size from the sign.

And this is the singular value decomposition of negative two.


---

Then it's the usual positive multiplication, and for the signs either
they cosign or they don't.


---

When length is one, the measuring stick just measures units of length
in its direction.


---

What if we have two inputs and one output? All we can do is this.


---

Proof.


---

We'll also call this kind of thing a dot product.

Let's write it differently.


---

Let's put the _a_ and _b_ like this.


---

Which we'll call a row.


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

I like “Rows reach right, columns lean left.”


---

Now this is all lined up like a pipeline. If we _flip_ that
pipeline...


---

Of course it has to come out like this, with rows and columns
transposed.


---

Okay, call this guy a vector. What about length? Maybe you know the
Pythagorean theorem?


---

Proof.


---

Sure. Square root the dot product, length is five, and now we have
essentially the singular value decomposition of that vector: a length
times a unit direction. This is basically polar coordinates.


---

All the 2D unit directions make this circle.


---

We compare directions with the dot product again, and get no-kidding
cosine. Which works everywhere because it's invariant to rotation.


---

Proof.


---

And when things are perpendicular, the cosine is zero.


---

Let's see vectors as detectors and emitters.

---

With our row we have one spot on the left and two on the right.


---

A vector can come here and get measured in our direction.


---

Or we can produce a multiple of our vector.


---

A column is just the transpose.


---

It measures a vector coming from the left.


---

Or it produces a multiple of itself.


---

We still have this mnemonic.


---

Let's do many inputs and many outputs.


---

Here's an orthogonal matrix U with perpendicular unit vectors. On the
left, it detects along the row directions and emits along the column
directions.


---

The transpose does the opposite, so we can invert it.


---

And we already did inverses for diagonal matrices.


---

There might be zeros. We do what we can.


---

So here's the Fundamental Theorem of Linear Algebra: the Singular
Value Decomposition, SVD. Every matrix is like this! Notice rows on
the right, columns on the left.


---

That's also PCA, by the way.


---

And you already know how to invert SVD, or get close.


---

So now we can solve equations like this. But use a computer.

It won't work if the matrix is singular though.


---

You can still get some sort of solution like this. And that's linear
regression.


---

Let's see some data. Kids rated foods.


---

It's nice to subtract out the means.

Maybe you can tell there's only one singular value, and we could
reduce the dimensionality.


---

Measure those columns by themselves, you get sums of squares, a
multiple of the covariance matrix.


---

Make the rows unit length directions.


---

And measure the rows by themselves. That's Pearson's correlation
coefficients.

These measure matrices, Gram matrices, are always square. People
really like square matrices.


---

With a square matrix, you can find eigenvectors that just get
stretched by an eigenvalue, without changing direction. Maybe you can
diagonalize a matrix.

This sort of thing let's you do fun stuff like getting the closed form
for the nth Fibonacci number.


---

And that's about it! Thanks!
