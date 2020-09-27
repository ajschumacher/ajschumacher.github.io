# Definitional and Computational Sum of Squares are equal

The definitional (or conceptual) and computational forms of the
[sum of squared deviations from the mean][] are equivalent, as in
Equation 1.

[sum of squared deviations from the mean]: https://en.wikipedia.org/wiki/Total_sum_of_squares

\\[ SS = \sum \left( x - \overline{x} \right)^2 =
         \sum x^2 - \frac{ \left( \sum x \right)^2 }{ N } \tag{1} \\]

We have \\( N \\) numbers \\( x_i \\). Their mean is \\( \overline{x} \\).

\\[ \overline{x} = \frac{ \sum_{i=1}^{N} x_i }{ N }  \tag{2} \\]

The limits of every sum here are the same, and always range over the
numbers \\( x_i \\), so the limits and subscript \\( i \\) are not
shown outside of Equation 2.

The sum of squared deviations from the mean is defined as in Equation
1.

\\[ \sum \left( x - \overline{x} \right)^2 \tag{3} \\]

Distributing and rearranging, Expression 3 is the same as Expression
4.

\\[ \sum \left( x^2 + \overline{x} \left( \overline{x} - 2x \right) \right) \tag{4} \\]

Considering the properties of sums, Expression 4 can be re-written as
Expression 5.

\\[ \sum x^2 + \overline{x} \left( \sum \overline{x} -2 \sum x \right) \tag{5} \\]

The mean \\( \overline{x} \\) is a constant, so summing over it gives
\\( N \overline{x} \\). As can be seen from Equation 2, the sum over
\\( x \\) is also \\( N \overline{x} \\). Using these, Expression 5
becomes Expression 6.

\\[ \sum x^2 - N \overline{x}^2 \tag{6} \\]

Replacing the mean \\( \overline{x} \\) with its definition as in
Equation 2, we arrive at the computational form.

\\[ \sum x^2 - \frac{ \left( \sum x \right)^2 }{ N } \tag{7} \\]

Expression 3 and Expression 7 are therefore equal, as shown in
Equation 1. \\( \blacksquare \\)


---

I thought about writing this up years ago; here's an old
[draft](old.html). I referred to McDowell's [derivation][] (nominally
for variance) in writing the above. The computational form is nice
especially if you're calculating by hand, and is (has been?) sometimes
[taught][] as a procedure, sort of like long division. I don't think
teaching that is really a good idea, if what you care about is
teaching statistics, but it could be a neat example in the right kind
of course on implementation of algorithms (applied math or CS,
maybe?).

[derivation]: http://psychology.emory.edu/clinical/mcdowell/PSYCH560/Basics/var.html
[taught]: http://www.ablongman.com/graziano6e/text_site/MATERIAL/Stats/manvar.htm
