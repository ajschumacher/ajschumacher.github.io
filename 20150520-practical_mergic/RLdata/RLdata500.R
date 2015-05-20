# install.packages('RecordLinkage')
library('RecordLinkage')
data(RLdata500)
write.table(RLdata500, "RLdata500.txt",
            row.names=FALSE, col.names=FALSE,
            quote=FALSE, sep=",", na="")
write.table(RLdata500, "RLdata500.csv",
            row.names=FALSE,
            quote=FALSE, sep=",", na="")
