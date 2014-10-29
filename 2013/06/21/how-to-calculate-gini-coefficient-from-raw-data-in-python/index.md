# How to calculate Gini Coefficient from raw data in Python



The Gini Coefficient is a measure of inequality. It's well described on its <a href="http://en.wikipedia.org/wiki/Gini_coefficient">wiki page</a> and also with more simple examples <a href="http://www.intmath.com/blog/the-gini-coefficient-of-wealth-distribution/4187">here</a>.

I don't find the implementation in the R package <a href="http://cran.r-project.org/web/packages/ineq/index.html">ineq</a> particularly conversational, and also I was working on a Python project, so I wrote this function to calculate a Gini Coefficient from a list of actual values. It's just a fun little integration-as-summation. Not bad!

```

def gini(list_of_values):

  sorted_list = sorted(list_of_values)

  height, area = 0, 0

  for value in sorted_list:

    height += value

    area += height - value / 2.

  fair_area = height * len(list_of_values) / 2

  return (fair_area - area) / fair_area

```

To me this is fairly readable and maps nicely to the mental picture of adding up the area under the Lorenz curve and then comparing it to the area under the line of equality. It's just bars and triangles! And I don't think it's any less performant than the <code>ineq</code> way of calculating it.

(update: lalala, I think there are some edge cases where the standard way of calculating gini and this way are not in agreement; I'll look into it if I ever think about this again - feel free to figure it out and leave a comment!)



*This post was originally hosted elsewhere.*
