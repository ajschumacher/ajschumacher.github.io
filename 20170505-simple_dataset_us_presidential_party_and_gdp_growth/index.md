# Simple Dataset: US Presidential Party and GDP Growth

Here's a simple [dataset](president_gdp.csv) for use in examples. It's taken from the [online appendix](https://assets.aeaweb.org/assets/production/articles-attachments/aer/app/10604/20140913_app.pdf) to [Presidents and the US Economy: An Econometric Exploration](https://www.aeaweb.org/articles?id=10.1257/aer.20140913) by Blinder and Watson.

[`president_gdp.csv`](president_gdp.csv)

The fields are:

 * `term`: A short text description of the presidential term, like "Reagan 2".
 * `party`: The political party of the presidency, either "D" for the [Democratic Party](https://en.wikipedia.org/wiki/Democratic_Party_(United_States)) or "R" for the [Republican Party](https://en.wikipedia.org/wiki/Republican_Party_(United_States)).
 * `growth`: The average annualized growth in US Gross Domestic Product ([GDP](https://en.wikipedia.org/wiki/Gross_domestic_product)) for that presidential term, expressed as percentage points.

For more details, please see the [paper](http://pubs.aeaweb.org/doi/pdfplus/10.1257/aer.20140913) and [appendix](https://assets.aeaweb.org/assets/production/articles-attachments/aer/app/10604/20140913_app.pdf).

The only changes I've made are to order the data chronologically and put it in the convenient CSV format.

For example, in [R](https://www.r-project.org/), you can do the following:

```r
> data = read.csv('president_gdp.csv')
> lm(growth ~ party, data)
> t.test(growth ~ party, data)
```

Because the [dataset](president_gdp.csv) is so small, I'll also display it as spaced-out text here:

```
term,             party,  growth
Truman,               D,    6.57
Eisenhower 1,         R,    2.72
Eisenhower 2,         R,    2.26
Kennedy-Johnson,      D,    5.74
Johnson 2,            D,    4.95
Nixon 1,              R,    3.57
Nixon-Ford,           R,    1.97
Carter,               D,    3.56
Reagan 1,             R,    3.12
Reagan 2,             R,    3.89
G.H.W. Bush,          R,    2.05
Clinton 1,            D,    3.53
Clinton 2,            D,    4.00
G.W. Bush 1,          R,    2.78
G.W. Bush 2,          R,    0.54
Obama 1,              D,    1.98
```
