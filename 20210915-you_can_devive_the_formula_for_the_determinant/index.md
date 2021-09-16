# You can derive the formula for the determinant

> _“Determinants are difficult, non-intuitive, and often defined
> without motivation.” (Sheldon Axler, 1995)_


It's [common][] to talk about properties of the [determinant][], but
then treat its formula as almost coming from nowhere, focusing more on
[mnemonics][] than meaning. I think it could be worth seeing that the
determinant's formula pops out easily in a common setting.

[common]: https://smile.amazon.com/Linear-Algebra-Its-Applications-4th/dp/0030105676/
[determinant]: https://en.wikipedia.org/wiki/Determinant
[mnemonics]: https://www.mathsisfun.com/algebra/matrix-determinant.html


A matrix is a [transformation][] that maps [origin][] to origin. If a
matrix happens to map anything _else_ to the origin, then that matrix
isn't invertible, because no inverse can map the origin back to two
different points. So we seek a solution to a system of equations.

[transformation]: /20210915-flow_metaphor_for_matrix_multiplication/
[origin]: https://en.wikipedia.org/wiki/Origin_(mathematics)


\\[ \begin{bmatrix} a & b \\\ c & d \end{bmatrix}
    \begin{bmatrix} x \\\ y \end{bmatrix} =
    \begin{bmatrix} 0 \\\ 0 \end{bmatrix} \\]


Eliminating \\( x \\) and \\( y \\) ([example solution below][])
yields the familiar \\( ad - bc = 0 \\). That is, if \\( ad - bc = 0
\\), there's some \\( x \\) and \\( y \\) (not both zero) that the
matrix maps to the origin, and so the matrix is not invertible. The
determinant is \\( ad - bc \\).

[example solution below]: #solution


I worked through this also for the three-by-three case and was
satisfied to recover the usual expression. There's probably a deeper
proof or other connection to more linear algebra, but I don't recall
ever being taught any rationale at all for the determinant taking the
form it does, so I was just pleased that it's as straightforward as
this to show at this level. It's slower, but if you happen to forget
the formula for the determinant, you can always work it out again this
way!


---

### <a name="solution" href="#solution">Example solution</a>

The matrix equation above is equivalent to Equations 1 and 2.

\\[ ax + by = 0 \tag{1} \\]

\\[ cx + dy = 0 \tag{2} \\]

Solving Equation 1 for \\( x \\) produces Equation 3.

\\[ x = - \frac{b}{a} y \tag{3} \\]

Substituting Equation 3 into Equation 2 yields Equation 4.

\\[ - \frac{cb}{a}y + dy = 0 \tag{4} \\]

Multiplying by \\( a \\), dividing by \\( y \\), and reordering then
recovers the familiar form of the determinant in Equation 5.

\\[ ad - bc = 0 \tag{5} \\]


---

If I was just sleeping through linear algebra, please let
[me](/aaron/) know what I missed! Also let me know if there are any
problems with or alternatives to this method! Thanks!

The quote at top from [Axler][] is from his 1995 paper,
[Down with Determinants!][].

[Axler]: https://en.wikipedia.org/wiki/Sheldon_Axler
[Down with Determinants!]: https://www.axler.net/DwD.html

Thanks to Erica for helpful feedback!
