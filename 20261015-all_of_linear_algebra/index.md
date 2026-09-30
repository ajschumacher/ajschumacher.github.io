# All of Linear Algebra


[Deck](https://docs.google.com/presentation/d/1Ocew-wu96B0Rv-Rb3Vtio1Wmv9ezHMdaC_sP38muk1I/edit)


---

If math is about patterns, what patterns is Linear Algebra about?


---

This kind. How many flowers at 12 months?


---

Well, 5 plus 7 is 12. So we can also add up 10 and 14 to get 24.


---

And 4 times 3 is 12. So we can multiply 4 times 6 to get 24.


---

And of course it's just doubling. So we can double 12 to get 24.

That 2 is a “singular value” here. It's the “canonical multiplier”
(Joseph Sylvester's term) in a single direction.

That 2 can also be an eigenvalue, which is an “intrinsic” or “proper
value” (the English used before eigenvalue became standard) for
something that doesn't change direction.


---

In one dimension this is really all we get!


---

Proof.


---

So Linear Algebra is really very simple stuff.


---

If we write out such a pattern like this, it starts to look like a
measuring stick with different units on either side.


---

And you can go either way, to the right or the left, and each is the
inverse of the other. Two is invertible, one half is invertible.


---

But zero sends everything to a single value. We say zero is singular.
It's hardly a value at all! Once you're at zero, you don't know where
you came from, so there's no inverse, which is why “you can't divide
by zero.”


---

Negative numbers work fine though.


---

But you might want to break things up into length and direction.

This is the singular value decomposition of negative two: Two is the
size of the stretch, negative one is the direction.


---

Then we have the usual positive multiplication, and we evaluate the
directions by how much they agree. If the signs agree, they cosign.


---

Another way to think about our directions with unit length is as
measuring sticks with no change of units. They measure how long a
thing is in their direction.


---

Now let's have two inputs and one output. All we can do is this.


---

Proof.


---

We'll also call this kind of thing a dot product. How should we write
it?


---

Let's choose to write _a_ and _b_ like this.


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

So now these two guys are lined up like a pipeline. And if we _flip_
that pipe...


---

Of course it has to come out like this, with rows and columns
transposed.


---

Call this guy a vector. What about length? Can I use the Pythagorean
theorem?


---

Proof.


---

Sure. Square root the dot product, the length is five, and now we have
essentially the singular value decomposition of that vector: a length
times a unit direction. Basically polar coordinates.


---

All the 2D unit directions make this circle. We're throwing in
trigonometry as a bonus here.


---

We compare directions with the dot product again, and get cosine.
Which works everywhere because it's invariant to rotation.


---

Proof.


---

And when things are perpendicular, the cosine is zero.


---

Vectors are emitters and detectors.

Multiply a row from the left, you get a multiple of that row. Multiply
a row from the right, you detect how much the multiplier is in that
row's direction.


---

Multiply a column from the right, you get a multiple of that row.
Multiply a column from the left, you detect how much the multiplier is
in that column's direction.


---

Rows reach right, columns lean left.


---

Let's do two inputs and two outputs. You know the proof already.


---

Here's an orthogonal matrix with perpendicular unit vectors. On the
left, it detects along the row directions and emits along the column
directions.


---

The transpose does the opposite, so it's the inverse.


---

And you already know how to invert diagonal matrices, right?


---

Even if there are zeros on the diagonal, you know what to do to get as
close as possible to an inverse.


---

So here's the Fundamental Theorem of Linear Algebra: the Singular
Value Decomposition.


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

Let's make the rows unit length.


---

And measure the rows by themselves. That's Pearson's correlation
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

Thanks!
