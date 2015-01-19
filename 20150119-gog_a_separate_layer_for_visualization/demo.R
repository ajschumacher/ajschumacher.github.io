# devtools::install_github("ajschumacher/gogr")
library("gogr")
data <- data.frame(0-runif(100))
for (i in 1:91) {
    gog(data[i:(i+9), ,drop=F])
    Sys.sleep(2)
}

rstudio::viewer("http://localhost:8000")
library("gogr")
data <- iris
names(data)[1:2] <- c("x", "y")
gog(data)
