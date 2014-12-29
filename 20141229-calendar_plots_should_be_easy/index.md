# Calendar Plots should be Easy

Popularized by Mike Bostock's [example](http://bl.ocks.org/mbostock/4063318) and the GitHub [contribution calendar](https://github.com/blog/1360-introducing-contributions), calendar plots have some recognition now.

[![](calendar.png)](http://bit.ly/NYCsubway)

Calendar plots can be very good for showing daily data over time when weekly, monthly, and yearly structure are relevant. While color is not ideal for conveying numeric data, patterns can be made quickly discernible and interaction can add table lookup functionality.

I've made plots like [this](http://bit.ly/NYCsubway) myself, but it has required fiddling with HTML, CSS, and JavaScript in typical [D3](http://d3js.org/) fashion. There are some tools for making it easier to build these plots, like the [Cal-Heatmap](http://kamisama.github.io/cal-heatmap/v2/) JavaScript plugin and the Google Charts [Calendar Chart](https://developers.google.com/chart/interactive/docs/gallery/calendar), but even with these it's still an HTML/JavaScript affair.

I want to be able to do something like this in [R](http://www.r-project.org/) and get an interactive calendar plot:

```r
# this package does not (yet) exist
library(plotcal)
plot.cal(values, dates)
```

I want to be able to do something like this in [Python](https://www.python.org/) and get an interactive calendar plot:

```python
# this package does not (yet) exist
from plot_cal import plot_cal
plot_cal(values, dates)
```

Such functionality could also interact more closely with `data.frame`s/`DataFrame`s, tuples, maps/dicts, etc. That would be fine.

Somebody should make such functions, or extend some existing packages to include them. Or if such things already exist, somebody should just tell me about it. Either way, I will say thank you.
