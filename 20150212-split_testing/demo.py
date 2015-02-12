
from statsmodels.stats.proportion import proportion_effectsize
proportion_effectsize(0.6, 0.5)

from statsmodels.stats.power import zt_ind_solve_power
zt_ind_solve_power(effect_size=0.2, alpha=0.05, power=0.8)
