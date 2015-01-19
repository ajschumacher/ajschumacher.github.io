from gogpy import gog
import numpy as np
import pandas as pd
gog(pd.DataFrame(np.random.sample(10)))


import time
data = pd.DataFrame(np.random.sample(100))
for i in range(91):
    gog(data[i:i+10])
    time.sleep(2)


