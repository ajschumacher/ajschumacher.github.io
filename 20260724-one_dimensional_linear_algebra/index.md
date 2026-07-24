# One-dimensional Linear Algebra


Linear Algebra is the mathematics of _linear transformations_. It can
handle lots of dimensions, but let's explore the one-dimensional case
with real numbers.


A linear transformation is called _linear_ because it behaves like a
straight line that goes through the origin.


<!--

Linearity amounts to two rules. First, an input times a number and
then transformed has to be the same as the input transformed and then
multiplied by that number. In particular, the transform of zero is
zero: a linear transform goes through the origin. Second, the
transform of a sum of inputs has to be the same as the sum of those
inputs transformed: a linear transform has constant slope; it's
straight.

\\[ f(cu) = cf(u) \\]

-->


In one dimension, linear transforms are just multiplication. For
example, let's consider a transform \\( M \\) that multiplies by 4. We
can write the _matrix_ representation \\( M = \begin{bmatrix} 4
\end{bmatrix} \\).


To undo \\( M \\), we divide by 4, or equivalently multiply by the
multiplicative inverse of 4, which is \\( 4^{-1} = 0.25 \\). The
inverse of \\( M \\) is \\( M^{-1} = \begin{bmatrix} 0.25
\end{bmatrix} \\). So we have:


\\[ M^{-1}M = MM^{-1} = \begin{bmatrix} 1 \end{bmatrix} = I \\]


The transform \\( I \\) doesn't change anything and is called the
_identity_.


Just as you can't divide by zero, not every transform has an inverse.
The problem is when a transform sends multiple inputs to a single
output. Such a transform is called _singular_ and knowing its output
is not enough to know what its input was. The _determinant_ of a
singular matrix is zero. (The determinant of \\( M \\) is 4.)


In one dimension the only singular transform is \\( \begin{bmatrix} 0
\end{bmatrix} \\). It's a one-dimensional transform, but its output is
really zero-dimensional, and we say it has _rank 0_. In contrast, \\(
M \\) has rank 1, which is _full rank_ for a one-dimensional
transform. As long as \\( M \\) is full rank, it has an inverse and we
can solve for \\( X \\):


\\[
\begin{align}
MX &= C \\\\
X &= M^{-1}C
\end{align}
\\]


A linear transformation can reorient inputs in a rigid way, rotating
and flipping them without changing their distance to the origin.
Transforms that only do this are called _orthogonal_ and in our case
there are only two: \\( \begin{bmatrix} 1 \end{bmatrix} \\) and \\(
\begin{bmatrix} -1 \end{bmatrix} \\).


A linear transformation can also scale inputs without rotating them.
In one dimension we only have one direction, and any vector \\( v \\)
along that direction is just multiplied: \\( Mv = \lambda v \\). So we
have a single _eigenvalue_, \\( \lambda = 4 \\), and any non-zero
vector is a corresponding _eigenvector_. Often we choose an
eigenvector with length one, like \\( v = \begin{bmatrix} 1
\end{bmatrix} \\).


Any linear transform can be expressed as reorientation followed by
non-negative scaling followed by another reorientation, which is
called a _Singular Value Decomposition_:


\\[ M = U \Sigma V^T =
\begin{bmatrix} 1 \end{bmatrix}
\begin{bmatrix} 4 \end{bmatrix}
\begin{bmatrix} 1 \end{bmatrix}
\\]


Singular values (in \\( \Sigma \\)) are always non-negative, while
eigenvalues can be negative. If either are zero, the transformation is
singular: some whole dimension is getting projected to zero.


<!-- include polar decomposition? others? -->


In one dimension here, composing tranformations is just multiplying
real numbers, which is commutative. This is lost as soon as we involve
more dimensions: multiplying on the left is often different from
multiplying on the right. There are some other additional complexities
as well, but hopefully this one-dimensional tour is a helpful way to
quickly survey some core ideas in an accessible way.
