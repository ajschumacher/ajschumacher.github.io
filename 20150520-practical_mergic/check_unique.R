library("dplyr")

read.doe <- function(filename) {
  data <- read.csv(filename, as.is=TRUE,
                   skip=6, check.names=FALSE,
                   na.strings="s")
  stopifnot(names(data) == c("DBN", "Grade", "Year", "Category",
                             "Number Tested","Mean Scale Score",
                             "#","%","#","%","#","%","#","%","#","%"))
  names(data) <- c("dbn", "grade", "year", "category",
                   "num_tested", "mean_score",
                   "num1", "per1", "num2", "per2", "num3", "per3", "num4", "per4",
                   "num34", "per34")
 return(tbl_df(data))
}

gender <- read.doe("gender.csv")

gender

gender %>%
  select(dbn, grade, year, category) %>%
  duplicated %>%
  sum

gender %>%
  group_by(dbn, grade, year, category) %>%
  summarize(n=n()) %>%
  group_by(n) %>%
  summarize(count=n())

gender %>%
  group_by(dbn, grade, year, category) %>%
  filter(1 < n())

gender %>%
  filter(dbn=='01M019', year==2010, grade==3)


all_students <- read.doe("all.csv")
data <- bind_rows(all_students, gender)

data %>%
  filter(dbn=='01M019', year==2010, grade==3)
