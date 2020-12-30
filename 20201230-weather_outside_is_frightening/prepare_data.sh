# Originally found via:
#   https://www.climate.gov/maps-data/dataset/daily-temperature-and-precipitation-reports-data-tables
# This is about 11G of data, unzipped:
wget ftp://ftp.ncdc.noaa.gov/pub/data/ghcn/daily/by_year/2010.csv.gz
wget ftp://ftp.ncdc.noaa.gov/pub/data/ghcn/daily/by_year/2011.csv.gz
wget ftp://ftp.ncdc.noaa.gov/pub/data/ghcn/daily/by_year/2012.csv.gz
wget ftp://ftp.ncdc.noaa.gov/pub/data/ghcn/daily/by_year/2013.csv.gz
wget ftp://ftp.ncdc.noaa.gov/pub/data/ghcn/daily/by_year/2014.csv.gz
wget ftp://ftp.ncdc.noaa.gov/pub/data/ghcn/daily/by_year/2015.csv.gz
wget ftp://ftp.ncdc.noaa.gov/pub/data/ghcn/daily/by_year/2016.csv.gz
wget ftp://ftp.ncdc.noaa.gov/pub/data/ghcn/daily/by_year/2017.csv.gz
wget ftp://ftp.ncdc.noaa.gov/pub/data/ghcn/daily/by_year/2018.csv.gz
wget ftp://ftp.ncdc.noaa.gov/pub/data/ghcn/daily/by_year/2019.csv.gz

gunzip *.gz

grep -h TMIN ????.csv > 201X_TMIN.csv &
grep -h TMAX ????.csv > 201X_TMAX.csv &
grep -h PRCP ????.csv > 201X_PRCP.csv &

wget ftp://ftp.ncdc.noaa.gov/pub/data/ghcn/daily/ghcnd-stations.txt
