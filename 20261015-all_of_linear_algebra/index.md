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


v \cdot u =
\frac{1}{2}
\left(
| v |^2 + | u |^2 - | v-u |^2
\right)


\sqrt{
\begin{bmatrix}
3 & 4
\end{bmatrix}
\begin{bmatrix}
3 \cr 4
\end{bmatrix}
}
=5

\begin{bmatrix}
3 & 4
\end{bmatrix}
=
5
\begin{bmatrix}
\frac{3}{5} & \frac{4}{5}
\end{bmatrix}

\begin{bmatrix}
1 & 0
\end{bmatrix}
\begin{bmatrix}
\frac{3}{5} \cr \frac{4}{5}
\end{bmatrix}
=
\frac{3}{5}


\begin{bmatrix}
\frac{4}{5} & -\frac{3}{5} \cr
\frac{3}{5} & \frac{4}{5}
\end{bmatrix}^T
\begin{bmatrix}
\frac{4}{5} & -\frac{3}{5} \cr
\frac{3}{5} & \frac{4}{5}
\end{bmatrix}
=
\begin{bmatrix}
1 & 0 \cr
0 & 1
\end{bmatrix}


\begin{bmatrix}
\frac{1}{5} & 0 \cr
0 & \frac{1}{2}
\end{bmatrix}
\begin{bmatrix}
5 & 0 \cr
0 & 2
\end{bmatrix}
=
\begin{bmatrix}
1 & 0 \cr
0 & 1
\end{bmatrix}


\newcommand{\vlabel}[1]{\rule[-0.4em]{0pt}{4.4em}\hspace{.8em}\rlap{\style{display:inline-block;transform:translateX(-2.2em) rotate(90deg);white-space:nowrap}{\text{#1}}}\hspace{0.6em}}
\begin{bmatrix} a & b \\ c & d \end{bmatrix}
=
\begin{bmatrix} \vlabel{left dir 1} & \vlabel{left dir 2} \end{bmatrix}
\begin{bmatrix} s_1 & 0 \\ 0 & s_2 \end{bmatrix}
\begin{bmatrix} \text{right dir 1} \\ \text{right dir 2} \end{bmatrix}
