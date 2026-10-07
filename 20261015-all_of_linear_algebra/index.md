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

And there's an underlying multiplicative pattern: times two.

That two is a “singular value” and also an “eigenvalue” here.


---

It's always just multiplying by a number! That's all it can be!


---

Proof.


---

And this is a college course?


---

What is multiplying anyway? It's a little like a measuring stick with
different units on either side.


---

And you can go either way, to the right or the left, and each is the
inverse of the other. Two is “invertible.”


---

But zero sends everything to a single value. Zero is singular. There's
no inverse, which is why “you can't divide by zero.”


---

Negative numbers work fine though.


---

We can separate the size from the sign.

This is the singular value decomposition of negative two.


---

Then it's the usual positive multiplication, and for the signs either
they cosign or they don't.


---

When length is one, unit length, the measuring stick just measures
length in its direction.

Also notice these are self-inverses.


---

What if we have two inputs and one output? All we can do is this.


---

Proof.


---

We'll also call this kind of thing a dot product. How should we write
it?


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

“Rows reach right, columns lean left.”


---

Now this is lined up like a pipeline. If we _flip_ that pipeline...


---

Of course it has to come out like this, with rows and columns
transposed.


---

Call this guy a vector. What about length? Maybe you know the
Pythagorean theorem?


---

Proof.


---

Sure. Square root the dot product, the length is five, and now we have
essentially the singular value decomposition of that vector: a length
times a unit direction. This is basically polar coordinates.


---

All the 2D unit directions make this circle.


---

We compare directions with the dot product again, and get cosine.
Which works everywhere because it's invariant to rotation.


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

It produces a multiple when it has something on the right.


---

We still have this mnemonic.


---

Let's do two inputs and two outputs. You know the proof already.


---

Here's an orthogonal matrix U with perpendicular unit vectors. On the
left, it detects along the row directions and emits along the column
directions.


---

The transpose does the opposite, so it's the inverse.


---

And we already did inverses for diagonal matrices.


---

There might be zeros. We do what we can.


---

So here's the Fundamental Theorem of Linear Algebra: the Singular
Value Decomposition, SVD.


---

That's already Principal Components Analysis, by the way.


---

And you already know how to invert SVD, or get close.


---

So now we can solve equations like this, conceptually. But use a
computer. It won't work if the matrix is singular though.


---

You can still get some sort of solution like this. And that's linear
regression.


---

Let's look at some data though. These kids rated foods.


---

It's nice to subtract out the means.

(Can you tell there's only one singular value?)


---

Measure those columns by themselves, you get sums of squares, a
multiple of the covariance matrix.


---

Let's make the rows unit length directions.


---

Measure the rows by themselves. That's Pearson's correlation
coefficients.

Notice these measure matrices, Gram matrices, are always square.
People really like square matrices.


---

With a square matrix, you can find eigenvectors that just get
stretched by an eigenvalue, without changing direction. Maybe you can
diagonalize a matrix.

This let's you do fun things like get the closed form for the nth
Fibonacci number.


---

And that's about it! Thanks!
