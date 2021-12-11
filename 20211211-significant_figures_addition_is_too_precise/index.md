# Significant Figures: Addition is too precise

The usual [rules][] for adding and subtracting numbers with
significant digits often propagate uncertainly approximately
correctly, but always give results more precise than they actually are
because they don't (and can't, generally) follow the
[Variance Sum Law][].

[rules]: https://en.wikipedia.org/wiki/Significance_arithmetic#Addition_and_subtraction_using_significance_arithmetic "Wikipedia: Addition and subtraction using significance arithmetic"
[Variance Sum Law]: /20201030-the_variance_sum_law_is_interesting/ "The Variance Sum Law is Interesting"


Say a [number][] in Significant Figures with rightmost significant
digit \\( D \times 10^N \\) has uncertainty with standard deviation
\\( \sigma \times 10^N \\), and assume errors are always uncorrelated.

[number]: /20211209-significant_figures_gaussian_uncertainty/ "Significant Figures: Gaussian uncertainty, σ=2.5eN"


So the number 12.3, with three significant figures, has uncertainty
\\( \sigma \times 0.1 \\), and 2.48 has \\( \sigma \times 0.01 \\).
Adding them gives 14.8, which has the same uncertainty as 12.3. By the
[Variance Sum Law][], the true uncertainty is \\( \sigma \times 0.1005
\\), but that's pretty close to \\( \sigma \times 0.1 \\). In this
way, the usual rule for adding with significant figures is often
reasonable-seeming.


With many numbers of the same precision, however, the usual rules are
more problematic. If you add 1.2 + 3.4 + 5.6 + 7.8, the result 18.0
implies \\( \sigma \times 0.1 \\), but in fact uncertainty has doubled
to \\( \sigma \times 0.2 \\). Significant Figures has no way to convey
this, because it only communicates in powers of ten.


Adding and subtracting 100 numbers with the same precision, then,
should give a result with exactly one fewer significant figures. With
25 numbers the standard deviation could “round up” to the next power
of ten, arguably. It may not be common to add so many numbers with
significant figures, but even with just a few, Sig Figs is a course
approximation of correct propagation of uncertainty.
