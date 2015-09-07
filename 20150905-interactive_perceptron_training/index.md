# Interactive Perceptron Training

A little while ago I [contributed](../20150610-a_javascript_perceptron/) a simple [perceptron](https://en.wikipedia.org/wiki/Perceptron) model for the [Simple Statistics](http://simplestatistics.org/) JavaScript library. This makes possible things like this interactive perceptron model training environment, in which you can get a “hands-on” feel for how the model works in two dimensions.

The space below starts all red, which means the model starts predicting any given point is “negative.” As you update things, the color will update to show where the model would predict positive (blue) and negative (red).

The space below is clickable! One normal (left) click will add a blue (positive; label “1”) point. Clicking on a blue point will turn it red (negative; label “0”). Clicking on a red point will remove it. So you can cycle between no point, blue point, red point, no point.

To train the model, choose a point and use your other click (control click or right click). The perceptron model updates when it makes an incorrect prediction. You'll see details about this process below the box, as it happens!

<center><div id="space"></div></center>

### Diagnostics appear with model training:

<div id="status"></div>

You can follow the model fitting step by step! (To reset everything, just reload the page.)

Since we're in two dimensions, each data point has an _x_ and _y_ coordinate, written _[x, y]_. The perceptron model has two weights that correspond to the _x_ and _y_ directions (let's just call them _a_ and _b_), and a bias term which we can call _c_.  The model predicts _positive_ (blue) if _a*x + b*y + c_ is greater than zero, and _negative_ (red) otherwise. (You can think of the bias term as a weight that is always multiplied by one.)

One thing that became particularly clear as I put this together is how really essential centering and scaling data is. With points within three of the origin in either direction, the model can usually do well in a reasonable number of training steps, especially if the points are spread around the origin. But try putting two points of opposing color on a diagonal near the same corner of the box. It takes _forever_ to fit! The perceptron has a hard time moving away from intercepting the origin.

You can also see quite plainly that the (single layer) perceptron classifies by linear separation, so it can't handle the [XOR problem](http://www.ece.utep.edu/research/webfuzzy/docs/kk-thesis/kk-thesis-html/node19.html).

Fun!

<script src="d3.v3.min.js"></script>
<script src="simple_statistics.min.js"></script>
<link rel="stylesheet" href="style.css">
<script src="script.js"></script>
