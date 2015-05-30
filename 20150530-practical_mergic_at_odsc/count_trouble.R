first <- data.frame(x=c(1, 2, 3), y1=c("looks", "oh", "well"))
second <- data.frame(x=c(1, 2, 2), y2=c("good", "boy", "no"))

nrow(first)
nrow(second)
result <- merge(first, second)
nrow(result)

first
second
result
