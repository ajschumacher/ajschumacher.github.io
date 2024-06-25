# A brief development of matrix multiplication

Linear Algebra is math for multiple dimensions. Linearity is a
constraint that makes handling multi-dimensional complexity more
tractable. The structure of linear transformations quickly gives rise
to the dot product and matrix multiplication.

In Linear Algebra, a function is linear if \\( f(u+v) = f(u) + f(v)
\\) and \\( f(cu) = cf(u) \\). This is a powerful constraint. The
common equation of a line, \\( y = f(x) = mx + b \\), is not linear by
this definition when \\( b \neq 0 \\). In the situation of one numeric
input and output, linear functions are multiplication by a constant
coefficient, \\( y = f(x) = mx \\).

If there are two inputs and one output, linear functions are
multiplications followed by addition, \\( y = f(x_1, x_2) = m_1 x_1 +
m_2 x_2 \\). This is the dot product of the vector \\( \vec{x} = (x_1,
x_2) \\) and the coefficient vector \\( \vec{m} = (m_1, m_2) \\). The
result is a linear combination of the inputs.

If there are two inputs and two outputs, each output is a linear
combination of the inputs, \\( (y_1, y_2) = f(x_1, x_2) = (m_1 x_1 +
m_2 x_2, m_3 x_1 + m_4 x_2) \\), also written \\( \vec{y} = M \vec{x}
\\).

Applying a second linear transform \\( N \\) to the output of \\( M
\\), the new outputs \\( y_1 \\) and \\( y_2 \\) are:

\\[ n_1 (m_1 x_1 + m_2 x_2) + n_2 (m_3 x_1 + m_4 x_2), \\\
    n_3 (m_1 x_1 + m_2 x_2) + n_4 (m_3 x_1 + m_4 x_2)  \\]

Re-grouping shows that applying these two linear transforms one after
the other is the same as applying just one linear transform with
different coefficients:

<!--
n_1 m_1 x_1 + n_1 m_2 x_2 + n_2 m_3 x_1 + n_2 m_4 x_2,
n_3 m_1 x_1 + n_3 m_2 x_2 + n_4 m_3 x_1 + n_4 m_4 x_2

n_1 m_1 x_1 + n_2 m_3 x_1 + n_1 m_2 x_2 + n_2 m_4 x_2,
n_3 m_1 x_1 + n_4 m_3 x_1 + n_3 m_2 x_2 + n_4 m_4 x_2
-->

\\[ (n_1 m_1 + n_2 m_3) x_1 + (n_1 m_2 + n_2 m_4) x_2, \\\
    (n_3 m_1 + n_4 m_3) x_1 + (n_3 m_2 + n_4 m_4) x_2  \\]

If \\( N M = T \\), then \\( t_1 \\) is the dot product of \\( (n_1,
n_2) \\) and \\( (m_1, m_3) \\), and so on. The coefficients can be
arranged so that each pair that appears is adjacent horizontally or
vertically.

\\[
\begin{bmatrix}
n_1 & n_2 \\\
n_3 & n_4
\end{bmatrix}
\begin{bmatrix}
m_1 & m_2 \\\
m_3 & m_4
\end{bmatrix} =
\begin{bmatrix}
n_1 m_1 + n_2 m_3 & n_1 m_2 + n_2 m_4 \\\
n_3 m_1 + n_4 m_3 & n_3 m_2 + n_4 m_4
\end{bmatrix}
\\]

There is a choice here: The coefficients are written in English
reading order, left to right and top to bottom. They could just as
well be placed top to bottom and right to left, for example. This
choice is arbitrary, but the nature of matrix multiplication is not.


---

This is a terse version of what I think could be a good way to
introduce Linear Algebra and matrix multiplication. It is a more
traditionally symbolic version of
[the flow metaphor for matrix multiplication][], with more focus on
linearity as a driving part of the meaning of Linear Algebra.

[the flow metaphor for matrix multiplication]: /20210915-flow_metaphor_for_matrix_multiplication/
