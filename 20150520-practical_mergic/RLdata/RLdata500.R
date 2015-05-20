# install.packages('RecordLinkage')
library('RecordLinkage')
data(RLdata500)
write.table(RLdata500, "RLdata500.csv",
            row.names=FALSE, col.names=FALSE,
            quote=FALSE, sep=",", na="")

RLdata500lines <- read.table("RLdata500.csv")
RLdata500lines$id <- identity.RLdata500
RLdata500pairs <- merge(RLdata500lines, RLdata500lines, by='id')
RLdata500dupes <- subset(RLdata500pairs, V1.x != V1.y)
RLdata500dupes <- subset(RLdata500dupes, !duplicated(id))
RLdata500dupes$id <- NULL
write.table(RLdata500dupes, "RLdata500dupes.csv",
            row.names=FALSE, col.names=FALSE,
            sep=",")
