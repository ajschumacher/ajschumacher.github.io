# NYU Large Scale Machine Learning (Big Data) Lecture Three: Online Non-Linear/Non-Convex Models, and Boosted Decision Trees

<p>Yann:<br>
<br>
non-convex optimization in machine learning<br>
- oh no! GLM has (generally) convex loss functions!<br>
- SVMs have inequality constraints (so it's hard even though they<br>
have convex loss)<br>
multi-layer neural nets coming back in fashion<br>
anything with products of parameters<br>
<br>
you have to free yourself from the idea that non-convex is too<br>
complicated and convex is always simple<br>
vasly different types of non-convexity<br>
<br>
convexity is overrated<br>
using a suitable architecture is more important than insisting on convexity<br>
- very popular paper - achieved speedup by replacing convex loss<br>
function with non-convex one<br>
<br>
big win with convolutional net<br>
not only the performance is bad but it also takes a very long time to<br>
give you a bad answer<br>
chop off the last layer of the convolutional net and train an SVM on it<br>
SVM has a compinatorial discrete choice issue<br>
<br>
re-show couple slides from last time...<br>
- consider: why not squeeze down axis in the not-steep loss-function direction?<br>
- this kind of technique is called pre-conditioning (one type of it, anyway)<br>
- requires computing diagonal terms of hessian<br>
- for non-linear system this can still be hard (neural net~)<br>
- - use chain rule for second derivatives and ignore the second term,<br>
then just get diagonal terms<br>
- - very much like a "back prop" ("same cost as regular backprop")<br>
<br>
sigmoids (and other scalar functions) / weighted sums / RBFs<br>
<br>
kind of nice that he just says x and w instead of chi and omega<br>
(usually) - (still epsilon instead of eta zero)<br>
<br>
stochastic diagonal Levenberg-Marquardt<br>
<br>
separate learning rate for each dimension, to determine the squeezing rate<br>
<br>
do it online (running average with instantaneous second derivatives)<br>
<br>
"additional cost over regular backprop is negligible"<br>
<br>
wow! really good convergence in picture! (differing learning rates<br>
rather than squeezing of dimension) (SDL-M is hot!)<br>
computing the Hessian by finite difference - possible, rarely useful<br>
get gradient and perterb it in one direction, see how much things<br>
change, it's like a second derivative<br>
<br>
possibly not symmetric, so: approximate by doing average with transpose<br>
large eigenvalues of the hessian of a nerual net are "the killers"<br>
big eigenvalues will kill your convergence - learning rate can't be<br>
more than 1/(largest eigenvalue)<br>
so: low rank approximation of hessian<br>
for layers of neural nets, second derivative is often smaller in lower layers<br>
- compensate by using the 2nd derivative diagonal<br>
to get rid of big eigenvalues:<br>
mean cancellation<br>
KL-expansion<br>
covariance equalization<br>
computing the product of the hessian by a vector - without computing the hessian<br>
- with finite difference; two backprops<br>
then: power method: repeatedly multiply by hessian; eventually gets<br>
you eigenvector of largest eigenvalue<br>
(requires 2 forward props and 2 backward props per iteration)<br>
then: make whole thing on-line with similar running-average idea<br>
<br>
converges quickly to largest eigenvalue of the AVERAGE Hessian<br>
<br>
whole recipe slide<br>
<br>
pretty good online learning rate!<br>
<br>
minimizes error for given number of epochs through training data<br>
a cautionary tale about the loss surface for a neural net<br>
actually very complicated<br>
<br>
even for very simple example, pretty complex loss surface, including<br>
pretty flat areas, which are bad<br>
but it gets better when you have more complex layers that create<br>
proportionally more local minima versus flattish areas<br>
<br>
also: fixed first layer, trainable second layer<br>
SVMs are basically a particular way of doing this (a big fixed hidden layer)<br>
break!<br>
Tong Zhang from Rutgers University (formerly Yahoo research with John)<br>
GUEST LECTURE on BOOSTING<br>
<br>
learning algorithm A: train and test<br>
<br>
interested in non-linear<br>
<br>
some non-linearity via nonlinear features (e.g. kernel methods)<br>
really still linear though<br>
nonlinear:<br>
- decision tree *<br>
- boosted decion trees *<br>
- neural networks<br>
learning non-linearity directly from data<br>
<br>
decision tree (typically binary) at each node, compare a feature to a threshold<br>
good: no loop, so top-down will work<br>
<br>
"rectangular segments"<br>
<br>
just decide at a leaf by probability score: in-class / all<br>
<br>
decision-tree learning:<br>
- important: tree growing (recursive search - attribute, threshold -<br>
pair to reduce error)<br>
- - optimize for lowest error at every splitting<br>
- less important: tree pruning<br>
<br>
least squares is an appropriate loss function (classification error may not be)<br>
<br>
you try every combination of attribute (feature) and threshold at<br>
every splitting - wow, that seems expensive<br>
- apparently there is a fast way of computing the error? (greedy<br>
algorithm - but need some smoothness, least squares is good but not<br>
classification error)<br>
some issues:<br>
- tests all features and thresholds (do some sorting, it's a little<br>
better I guess)<br>
- stopping criteria (depth-first(really just fix a depth) vs.<br>
best-first(really just fix a number of nodes - preferred by prof Yang)<br>
- numerical: ordered; so what about categorical? how do you split them up?<br>
- missing data: put it as an extra value? impute as if missing at<br>
random? use zero?<br>
<br>
large scale implementation slide - just because John is interested<br>
"you just need some coding, but that's no conceptual problem"<br>
left as an exercise hahaha<br>
<br>
remarks:<br>
<br>
good: interpretable, handles non-homogeneous features, finds<br>
non-linear interactions<br>
bad: usually not the most accurate by itself<br>
<br>
tuning is not too bad, just pick your depth or number of nodes<br>
improve accuracy through tree ensemble (forest)<br>
- bagging (bootstrap samples)<br>
- random forest (bagging plus more randomization) (stabilizes a little)<br>
- boosting (clear favorite of Prof Yang) (relatively consistent small<br>
improvement over random forest)<br>
- direct forest learning<br>
<br>
(and then ensemble multiple methods)<br>
forest: multiple trees with common root (or not, it doesn't matter)<br>
output is weighted average (WEIGHTED HOW?)<br>
why bagging and rf work:<br>
tree is unstable, differnet ones very different, could overfit a lot<br>
so: average to reduce variance<br>
related to bayesian idea of averaging over all possible trees<br>
boosting:<br>
given a learning algo, how to generate ensemble candidates and how do<br>
you combine the generated ensemble candidates<br>
one way: go algo with multiple samples (bagging) then do greedy<br>
stage-wise optimization, adaptive resampling (bias reduction; actively<br>
minimize loss function)<br>
okay to build shallow trees (combine them to get better)<br>
<br>
linear model of high order features:<br>
- automatically find high order interactive features, handle<br>
- handle heterogeneous features<br>
- high order functions are indicator functions<br>
<br>
some alternatives blah blah blah<br>
weak learning and adaptive resampling<br>
- overweight more difficult training samples *** not on slide<br>
"AdaBoost" how to reweight and how to compute w<br>
<br>
some noise about margin error...<br>
<br>
going to greedy boosting<br>
- it's just weighting your best trees higher, right?<br>
- but then BAM it turns out to be identical to the Adaboost update<br>
for binary outputs<br>
<br>
move to general loss function<br>
<br>
greedy algorithm becomes a generalization of Adaboost<br>
<br>
but: greedy weak learning is specialized and hard to implement, so, simplify?<br>
<br>
Jerry Friedman says: use simplified weak learner: nonlinear regression<br>
base learner A<br>
<br>
so use this A to optimize complex (general) loss functions<br>
with: functional gradient boosting based on a functional<br>
generalization of gradient descent: a generalization of Addaboost<br>
shows gradient boosting algorithm<br>
wow people throw line search in fricking EVERYWHERE just for fun!<br>
why people like that? very popular algo in data mining<br>
why popular? very little tuning to do<br>
- number of trees<br>
- shrinkage parameter<br>
- tree size (depth or number of nodes)<br>
<br>
boosting is analogous to depth-first search<br>
can employ best-first with regularization to achieve somwhate better<br>
results (regularized greedy forest or RGF (HA! THAT'S WHAT RGF WAS!)<br>
(WAIT NO, WHAT WAS RBF? Random Boosted Forest maybe?)<br>
DEMO DEMO DEMO! coming soon?<br>
<br>
gbm in R: popular implementation of gradient boosting (ten years old<br>
but people are happy with it)<br>
pGBRT<br>
RGF<br>
<br>
references... (book whose authors all became national academy of<br>
sciences members)<br>
way to make greedy algorithm clearer: Additive lgoistic regression<br>
"casual demo" WHOOOOOO<br>
<br>
demo with R gbm<br>
<br>
decision trees are good for cases where many predictors are similarly<br>
informative (?) (missed something from Yann)<br>
<br>
not really getting at "deeper structure" perhaps???<br>
linear appropriate for only particularly well-selected (constructed?)<br>
features, or perhaps computational linguistics where bag of words is<br>
pretty good apparently - dealing with non-linearity is hard<br></p>


*This post was originally hosted elsewhere.*
