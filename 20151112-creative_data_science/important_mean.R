d <- read.csv("important_stats.csv")
cat(mean(d$growth, na.rm=TRUE))
