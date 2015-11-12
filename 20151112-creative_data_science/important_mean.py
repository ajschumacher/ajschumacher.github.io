import pandas as pd

d = pd.read_csv("important_stats.csv")
print d.growth.mean()
