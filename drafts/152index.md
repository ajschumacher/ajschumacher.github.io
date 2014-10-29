# NYU Large Scale Machine Learning (Big Data) Lecture Three: Online Non-Linear/Non-Convex Models, and Boosted Decision Trees


Yann:

non-convex optimization in machine learning
- oh no! GLM has (generally) convex loss functions!
- SVMs have inequality constraints (so it's hard even though they
have convex loss)
multi-layer neural nets coming back in fashion
anything with products of parameters

you have to free yourself from the idea that non-convex is too
complicated and convex is always simple
vasly different types of non-convexity

convexity is overrated
using a suitable architecture is more important than insisting on convexity
- very popular paper - achieved speedup by replacing convex loss
function with non-convex one

big win with convolutional net
not only the performance is bad but it also takes a very long time to
give you a bad answer
chop off the last layer of the convolutional net and train an SVM on it
SVM has a compinatorial discrete choice issue

re-show couple slides from last time...
- consider: why not squeeze down axis in the not-steep loss-function direction?
- this kind of technique is called pre-conditioning (one type of it, anyway)
- requires computing diagonal terms of hessian
- for non-linear system this can still be hard (neural net~)
- - use chain rule for second derivatives and ignore the second term,
then just get diagonal terms
- - very much like a "back prop" ("same cost as regular backprop")

sigmoids (and other scalar functions) / weighted sums / RBFs

kind of nice that he just says x and w instead of chi and omega
(usually) - (still epsilon instead of eta zero)

stochastic diagonal Levenberg-Marquardt

separate learning rate for each dimension, to determine the squeezing rate

do it online (running average with instantaneous second derivatives)

"additional cost over regular backprop is negligible"

wow! really good convergence in picture! (differing learning rates
rather than squeezing of dimension) (SDL-M is hot!)
computing the Hessian by finite difference - possible, rarely useful
get gradient and perterb it in one direction, see how much things
change, it's like a second derivative

possibly not symmetric, so: approximate by doing average with transpose
large eigenvalues of the hessian of a nerual net are "the killers"
big eigenvalues will kill your convergence - learning rate can't be
more than 1/(largest eigenvalue)
so: low rank approximation of hessian
for layers of neural nets, second derivative is often smaller in lower layers
- compensate by using the 2nd derivative diagonal
to get rid of big eigenvalues:
mean cancellation
KL-expansion
covariance equalization
computing the product of the hessian by a vector - without computing the hessian
- with finite difference; two backprops
then: power method: repeatedly multiply by hessian; eventually gets
you eigenvector of largest eigenvalue
(requires 2 forward props and 2 backward props per iteration)
then: make whole thing on-line with similar running-average idea

converges quickly to largest eigenvalue of the AVERAGE Hessian

whole recipe slide

pretty good online learning rate!

minimizes error for given number of epochs through training data
a cautionary tale about the loss surface for a neural net
actually very complicated

even for very simple example, pretty complex loss surface, including
pretty flat areas, which are bad
but it gets better when you have more complex layers that create
proportionally more local minima versus flattish areas

also: fixed first layer, trainable second layer
SVMs are basically a particular way of doing this (a big fixed hidden layer)
break!
Tong Zhang from Rutgers University (formerly Yahoo research with John)
GUEST LECTURE on BOOSTING

learning algorithm A: train and test

interested in non-linear

some non-linearity via nonlinear features (e.g. kernel methods)
really still linear though
nonlinear:
- decision tree *
- boosted decion trees *
- neural networks
learning non-linearity directly from data

decision tree (typically binary) at each node, compare a feature to a threshold
good: no loop, so top-down will work

"rectangular segments"

just decide at a leaf by probability score: in-class / all

decision-tree learning:
- important: tree growing (recursive search - attribute, threshold -
pair to reduce error)
- - optimize for lowest error at every splitting
- less important: tree pruning

least squares is an appropriate loss function (classification error may not be)

you try every combination of attribute (feature) and threshold at
every splitting - wow, that seems expensive
- apparently there is a fast way of computing the error? (greedy
algorithm - but need some smoothness, least squares is good but not
classification error)
some issues:
- tests all features and thresholds (do some sorting, it's a little
better I guess)
- stopping criteria (depth-first(really just fix a depth) vs.
best-first(really just fix a number of nodes - preferred by prof Yang)
- numerical: ordered; so what about categorical? how do you split them up?
- missing data: put it as an extra value? impute as if missing at
random? use zero?

large scale implementation slide - just because John is interested
"you just need some coding, but that's no conceptual problem"
left as an exercise hahaha

remarks:

good: interpretable, handles non-homogeneous features, finds
non-linear interactions
bad: usually not the most accurate by itself

tuning is not too bad, just pick your depth or number of nodes
improve accuracy through tree ensemble (forest)
- bagging (bootstrap samples)
- random forest (bagging plus more randomization) (stabilizes a little)
- boosting (clear favorite of Prof Yang) (relatively consistent small
improvement over random forest)
- direct forest learning

(and then ensemble multiple methods)
forest: multiple trees with common root (or not, it doesn't matter)
output is weighted average (WEIGHTED HOW?)
why bagging and rf work:
tree is unstable, differnet ones very different, could overfit a lot
so: average to reduce variance
related to bayesian idea of averaging over all possible trees
boosting:
given a learning algo, how to generate ensemble candidates and how do
you combine the generated ensemble candidates
one way: go algo with multiple samples (bagging) then do greedy
stage-wise optimization, adaptive resampling (bias reduction; actively
minimize loss function)
okay to build shallow trees (combine them to get better)

linear model of high order features:
- automatically find high order interactive features, handle
- handle heterogeneous features
- high order functions are indicator functions

some alternatives blah blah blah
weak learning and adaptive resampling
- overweight more difficult training samples *** not on slide
"AdaBoost" how to reweight and how to compute w

some noise about margin error...

going to greedy boosting
- it's just weighting your best trees higher, right?
- but then BAM it turns out to be identical to the Adaboost update
for binary outputs

move to general loss function

greedy algorithm becomes a generalization of Adaboost

but: greedy weak learning is specialized and hard to implement, so, simplify?

Jerry Friedman says: use simplified weak learner: nonlinear regression
base learner A

so use this A to optimize complex (general) loss functions
with: functional gradient boosting based on a functional
generalization of gradient descent: a generalization of Addaboost
shows gradient boosting algorithm
wow people throw line search in fricking EVERYWHERE just for fun!
why people like that? very popular algo in data mining
why popular? very little tuning to do
- number of trees
- shrinkage parameter
- tree size (depth or number of nodes)

boosting is analogous to depth-first search
can employ best-first with regularization to achieve somwhate better
results (regularized greedy forest or RGF (HA! THAT'S WHAT RGF WAS!)
(WAIT NO, WHAT WAS RBF? Random Boosted Forest maybe?)
DEMO DEMO DEMO! coming soon?

gbm in R: popular implementation of gradient boosting (ten years old
but people are happy with it)
pGBRT
RGF

references... (book whose authors all became national academy of
sciences members)
way to make greedy algorithm clearer: Additive lgoistic regression
"casual demo" WHOOOOOO

demo with R gbm

decision trees are good for cases where many predictors are similarly
informative (?) (missed something from Yann)

not really getting at "deeper structure" perhaps???
linear appropriate for only particularly well-selected (constructed?)
features, or perhaps computational linguistics where bag of words is
pretty good apparently - dealing with non-linearity is hard



*This post was originally hosted elsewhere.*
