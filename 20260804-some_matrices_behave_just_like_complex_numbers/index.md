# Some matrices behave just like complex numbers


Complex numbers are usually introduced by inventing the "imaginary
number" _i_ as a new entity. Both historical mathematicians and modern
students are not always quick to get on board with this. A subset of
2-by-2 real matrices can be identified that has all the properties of
complex numbers, without introducing any new entities or operations,
and also making it easier to understand some of the properties of
complex numbers.


We can represent a number \\( \mathit{a} \\) as \\(
\bigl[ \begin{smallmatrix} a & 0 \cr 0 & a \end{smallmatrix} \bigr]
\\). So we have \\( \mathit{1} =
\bigl[ \begin{smallmatrix} 1 & 0 \cr 0 & 1 \end{smallmatrix} \bigr]
\\) and \\( \mathit{-1} =
\bigl[ \begin{smallmatrix} -1 & 0 \cr 0 & -1 \end{smallmatrix} \bigr]
\\). This feels a little bit redundant, but addition and
multiplication and everything work just fine this way.


But if we consider all real 2-by-2 matrices, we can now find square
roots for \\( \mathit{-1} \\). Two such are \\(
\bigl[ \begin{smallmatrix} 0 & -1 \cr 1 & 0 \end{smallmatrix} \bigr]
\\) and \\(
\bigl[ \begin{smallmatrix} 0 & 1 \cr -1 & 0 \end{smallmatrix} \bigr]
\\), as you can check using the usual matrix multiplication.


Relaxing the initial representation of numbers as \\( \mathit{a} =
\bigl[ \begin{smallmatrix} a & 0 \cr 0 & a \end{smallmatrix} \bigr]
\\) to allow these is analogous to inventing the imaginary number _i_,
but feels less artificial since we're already looking at matrices.
Note there are no new rules for how to multiply anything and no new
symbols.


We have a choice about which root to use as positive \\( \mathit{i}
\\), but most people seem to like \\( i =
\bigl[ \begin{smallmatrix} 0 & -1 \cr 1 & 0 \end{smallmatrix} \bigr]
\\). Then for an arbitrary complex number, \\( a + bi =
\bigl[ \begin{smallmatrix} a & -b \cr b & a \end{smallmatrix} \bigr]
\\). Already matrix transpose gives us the complex conjugate.


Picturing such a number as the point \\( (a, b) \\) in the plane, we
can start to explore multiplication's ability to rotate. Multiplying
by \\( \mathit{i} \\) rotates by 90 degrees.


To rotate without stretching, we need the "length" of our number to be
one: \\( a^2 + b^2 = 1^2 \\). For the first quadrant, with \\( x \\)
ranging from 0 to 1, that gives numbers of the form \\(
\bigl[ \begin{smallmatrix} x & - \sqrt{1-x^2} \cr \sqrt{1-x^2} & x \end{smallmatrix} \bigr]
\\). I find it's more convenient to parameterize as \\(
\bigl[ \begin{smallmatrix} \sqrt{x} & - \sqrt{1-x} \cr \sqrt{1-x} & \sqrt{x} \end{smallmatrix} \bigr]
\\) because then it's very quick to write examples like \\(
\bigl[ \begin{smallmatrix} \sqrt{\frac{1}{3}} & - \sqrt{\frac{2}{3}} \cr \sqrt{\frac{2}{3}} & \sqrt{\frac{1}{3}} \end{smallmatrix} \bigr]
\\). But the most common way to parameterize this is as \\(
\bigl[ \begin{smallmatrix} \cos \theta & - \sin \theta \cr \sin \theta & \cos \theta \end{smallmatrix} \bigr]
\\). This is especially convenient since it covers all four quadrants
and we don't have to bound \\( \theta \\), and you may recognize it as
a standard way to write "the rotation matrix." It's completely
specified by the angle \\( \theta \\), and indeed the notation \\(
e^{i \theta}\\) is a "polar" representation of the same thing, that is
\\( \cos \theta + i \sin \theta \\), and so for example \\( e^{i \pi}
= -1 \\).


This is probably moving too fast, especially just at the end here, and
would benefit from some illustrations and further examples. (The idea
isn't original and has many other treatments online, too.) But for now
I'll leave it with just two further notes.


First, it should be clear that since a restricted subset of 2-by-2
matrices can model complex numbers, they can in fact do even more than
complex numbers can. In some sense the matrices are "more powerful."
They are also "less controlled" because of that flexibility. (For
example, complex numbers have commutative multiplication, while the
matrices don't.)


Second, this approach of building one structure from another shows
that there are different equivalent ways to define mathematical ideas.
Don't like the "magic" of imaginary numbers? There's nothing imaginary
about these matrices. And this is general. Don't trust "negative"
numbers? You can work with equivalence classes of pairs of positive
numbers. (My master's thesis did this kind of thing for quaternions,
even.)
