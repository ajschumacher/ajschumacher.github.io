# Significant Figures: Rounding destroys information

Significant Figures often requires rounding so that the correct level
of uncertainty is conveyed. Rounding is only supposed to happen at the
“end” of calculations, and results can vary depending on what is
considered an intermediate vs. a final result. In all cases, rounding
is harmful and only necessary because of the limitations of
Significant Figures.

It should be clear that 4.3 with an [uncertainty][] \\( \sigma \times
0.1 \\) is not the same as 4.34 with the same uncertainty. It's
because Significant Digits can't say 4.34 without meaning the
uncertainty is \\( \sigma \times 0.01 \\) that we round to 4.3, if the
uncertainty is \\( \sigma \times 0.1 \\). But this has a cost: good
information is dropped.

[uncertainty]: /20211209-significant_figures_gaussian_uncertainty/

Consider adding 1 + 1.4 + 1.4. If we do it in one go, we get 3.8 and
then round to 4 for significance. But what if this is done in two
steps? Maybe one team does 1 + 1.4, correctly reports their result as
2, and then a second team builds on that, adding 1.4 to get 3. The
rounding that Significant Figures requires degrades the quality of
results.

At some point it isn't worth tracking every digit in a result, but
Significant Figures often encourages dropping too many. It may even
give people the incorrect idea that if our uncertainty suggests two
significant figures, we can't have three figures in our best guess at
what the value is. We absolutely can, but this requires a system more
expressive than Significant Figures to report.
