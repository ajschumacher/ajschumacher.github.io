# Data Science isn't Magic

This is the flow for a [DC Open Data Day](http://dc.opendataday.org/) 2015 workshop. It may not make sense out of context.

View this page as [slides](big.html) to make this site's base URL appear quite large so that people can find this easily.


-----

planspace.org

-----


### Workshop Outline

 * Intro / Disclaimer
 * [80% Definitions](80_percent_definitions/) ([slides](80_percent_definitions/big.html))
 * [Data Science is OSEMN](osemn/) ([slides](osemn/big.html))
 * [What's the Problem?](problem/) ([slides](problem/big.html))
 * Find NYC attendance data
     * [schools.nyc.gov](http://schools.nyc.gov/)
     * [About Us](http://schools.nyc.gov/AboutUs/)
     * [Our Schools](http://schools.nyc.gov/AboutUs/schools/)
     * [Data About Schools](http://schools.nyc.gov/AboutUs/schools/data/)
     * [Daily Attendance Rates](http://schools.nyc.gov/AboutUs/schools/data/Attendance.htm)
     * [XML](http://schools.nyc.gov/aboutus/data/attendancexml/)
     * [http://schools.nyc.gov/AboutUs/schools/data/attendancexml/](http://schools.nyc.gov/AboutUs/schools/data/attendancexml/)
 * Data Science [Tools](tools/) ([slides](tools/big.html))
 * Connect to RStudio in the cloud
     * Backup plan:
         * Install the appropriate `R` distribution for your system from this [mirror](http://watson.nci.nih.gov/cran_mirror/).
         * Install the [RStudio IDE](http://www.rstudio.com/ide/download/desktop) for `R`. The RStudio site should suggest an appropriate package for your system.
         * Download and unzip the [files](https://github.com/ajschumacher/odddsim/archive/master.zip) we're using. (They're [on GitHub](https://github.com/ajschumacher/odddsim), so you can clone if you prefer.)
 * Working with `R`
     * Working with one day of data (`01-day_attendance.R`)
     * Selecting usable data points (`02-select_totals.R`)
     * The relationship between temperature and attendance (`03-merge_and_plot.R`)
 * Bonus: Introducing the DC voter file


### Additional Resources

 * For learning `R`:
     * [Try R](http://tryr.codeschool.com/) is an interactive web site that guides you through `R` functionality in your web browser.
     * The [walking introduction to R](https://raw.githubusercontent.com/ajschumacher/gadsdc/master/02-R/walking_intro.Rmd) is an `R` script that you can open and work through in RStudio.
 * For more fun data:
     * [Accessing the World Bank Data APIs in Python, R, Ruby & Stata](http://blogs.worldbank.org/opendata/accessing-world-bank-data-apis-python-r-ruby-stata)
     * The [DC voter registration file](https://github.com/ajschumacher/dc_voter_reg)
