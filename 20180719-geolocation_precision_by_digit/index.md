# Geolocation precision by digit

Latitude and longitude define increasingly fine grids over the Earth
as you add digits after the decimal points, but no matter how fine the
grid, most things still aren't at points of intersection. How far you
can get from a closest point of intersection as the grid gets finer is
a way to describe precision. This precision can be compared to
measurement accuracy and the sizes of objects of interest.

The Earth is not perfectly spherical, and the size of one degree can
vary, especially for longitude. To get an upper bound on error, we'll
use the circumference of the Earth at the equator, around 40,075 km,
to start calculations. With correct rounding, maximum error in one
direction is half a unit. That maximum error could happen in two
directions. Using the usual Pythagorean theorem on a plane for the
worst-case diagonal distance is easy and will be slightly higher than
the actual distance along the Earth's surface, assuming no change in
elevation, so the bound won't even be as tight as it could be. Also
I'll round up.


---


### 0.° lat, 0.° lon: 80 km

Every point that rounds, to the nearest degree, to a particular
latitude and longitude, is within 80 kilometers of the exact
intersection of those lines of latitude and longitude.


### 0.1° lat, 0.1° lon: 8 km

With one decimal place, you're within 8 km. This might already be
precise enough to describe a large city.


### 0° 59' lat, 0° 59' lon: 1.4 km

Any point that is the same to the nearest minute in latitude and
longitude is within 1.4 km of that position exactly.

I recommend sticking with the decimal system.


### 0.12° lat, 0.12° lon: 800 m

Two decimal places of precision gets you within 800 meters.


### 0.123° lat, 0.123° lon: 80 m

Three decimal places will always be within 80 m of the point
described. This is specific enough already for the smallest towns and
even large buildings.


### 0° 59' 59" lat, 0° 59° 59" lon: 22 m

When you have a location to the nearest second, it's within 22 m of
that exact location.

This is the annoying format that you get, for example, from the Apple
Compass app. If your phone's location accuracy
[is within 5 m](https://www.gps.gov/systems/gps/performance/accuracy/),
then you likely have your location correct to the nearest second,
though you may not. (Your phone reports more precise location values
internally, as you can see on your map.)


### 0.1234° lat, 0.1234° lon: 8 m

Four decimal places is enough to specify pretty much any landmark.


### 0.12345° lat, 0.12345° lon: 80 cm

You probably consider everything within your five-digit
latitude/longitude location your personal space. But also, at five
decimal places of precision, my best guess is that error in the
accuracy of your GPS is around the same size or greater than the error
from using this many digits.


### 0.123456° lat, 0.123456° lon: 8 cm

You don't need six digits of precision for the locations of buildings;
you need six digits of precision to describe where each plate is set
on the dinner table.

If you can measure your location as accurately as this, you have
specialized equipment and probably know more about these kinds of
error issues than I do.


### 0.1234567° lat, 0.1234567° lon: < 1 cm

With seven digits of precision you can differentiate one marble from
the marble next to it.


### 0.12345678° lat, 0.12345678° lon: < 1 mm

Is latitude and longitude really your best choice of coordinate
system?


---


You can check out my calculations in [latlon.ipynb](latlon.ipynb).
