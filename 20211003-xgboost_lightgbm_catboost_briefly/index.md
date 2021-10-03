# XGBoost/LightGBM/CatBoost (briefly)

There are many explainers of the popular gradient boosted tree models,
but this is short.

<table width="100%" border="1">
  <tr>
    <th style="width:33%;">
      <a href="https://xgboost.readthedocs.io/">XGBoost</a></th>
    <th style="width:34%;">
      <a href="https://lightgbm.readthedocs.io/">LightGBM</a></th>
    <th style="width:33%;">
      <a href="https://catboost.ai/">CatBoost</a></th>
  </tr>
  <tr>
    <td>search missing high and low</td>
    <td>search, then assign missing</td>
    <td>specify missing high or low</td>
  </tr>
  <tr>
    <td>"normal" balanced trees</td>
    <td>leaf-first tree growth</td>
    <td>oblivious trees (tables)</td>
  </tr>
  <tr>
    <td>you handle categories</td>
    <td>smart categorical ordering</td>
    <td>permuted target coding</td>
  </tr>
  <tr>
    <td>weighted quantile sketch</td>
    <td>sample high-grad examples</td>
    <td>permuted boosting</td>
  </tr>
  <tr>
    <td>regularized objective</td>
    <td>exclusive feature bundling</td>
    <td>learns category interactions</td>
  </tr>
  <tr>
    <td><a href="https://arxiv.org/abs/1603.02754">2016 paper</a></td>
    <td><a href="https://papers.nips.cc/paper/2017/hash/6449f44a102fde848669bdd9eb6b76fa-Abstract.html">2017 paper</a></td>
    <td><a href="https://arxiv.org/abs/1706.09516">2017 paper</a></td>
  </tr>
</table>

This is close to correct, I think. It probably won't help you
understand what's going on, but if you already know it might help jog
your memory. The models all work pretty well.
