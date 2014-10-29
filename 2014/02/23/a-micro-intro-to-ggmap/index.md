# A micro-intro to ggmap

<div>
<p>This describes what we did in the break-out session I facilitated for the illustrious&#160;<a href="http://richmanmax.com/">Max Richman</a>'s Open Mapping workshop at&#160;<a href="http://dc.opendataday.org/">Open Data Day DC</a>. For more detail, I recommend the original&#160;<a href="http://stat405.had.co.nz/ggmap.pdf">paper on&#160;<code>ggmap</code></a>.<br>
<br>
<code>ggmap</code>&#160;is an&#160;<code>R</code>&#160;package that does two main things to make our lives easier:<br>
</p>
<ul>
<br>
	<li>It wraps a number of APIs (chiefly the&#160;<a href="https://developers.google.com/maps/">Google Maps API</a>)&#160;to conveniently facilitate geocoding and raster map access in&#160;<code>R</code>.</li>
<br>
	<li>It operates together with&#160;<code>ggplot2</code>, another&#160;<code>R</code>&#160;package, which means all the power and convenience of the&#160;<a href="http://www.amazon.com/Grammar-Graphics-Statistics-Computing/dp/0387245448">Grammar of Graphics</a>&#160;is available for maps.</li>
<br>
</ul>
<br>
To install&#160;<code>ggmap</code>&#160;in&#160;<code>R</code>:<br>
<br>
```
install.packages("ggmap")
```
<br>
Then you can load the package.<br>
<br>
```

## Loading required package: ggplot2
```
<br>
<br>
One thing that&#160;<code>ggmap</code>&#160;offers is easy geocoding with the&#160;<code>geocode</code>&#160;function. Here we get the latitude and longitude of The World Bank:<br>
<br>
```
(addressll &lt;- geocode(address))

##      lon  lat
## 1 -77.04 38.9
```
<br>
<br>
The&#160;<code>ggmap</code>&#160;package makes it easy to get quick maps with the&#160;<code>qmap</code>&#160;function. There are a number of options available from various sources:<br>
<br>
```
qmap("Washington, DC", zoom = 13)
```
<br>
<br>
<a href="1.png"><img class="aligncenter size-full wp-image-808" alt="1" src="1.png"></a><br>
<br>
```
# An artistic map from Stamen
qmap("Washington, DC", zoom = 13, source = "stamen",
     maptype = "watercolor")
```
<br>
<br>
<a href="2.png"><img class="aligncenter size-full wp-image-809" alt="2" src="2.png"></a><br>
<br>
Since we were at The World Bank, here's a quick map showing where we were. This shows for the first time how&#160;<code>ggplot2</code>&#160;functions (<code>geom_point</code>&#160;here) work with&#160;<code>ggmap</code>.<br>
<br>
```
bankmap &lt;- qmap(address, zoom = 16, source = "stamen",
                maptype = "toner")
bankmap + geom_point(data = addressll,
                     aes(x = lon, y = lat),
                     color = "red",
                     size = 10)
```
<br>
<br>
<a href="3.png"><img class="aligncenter size-full wp-image-810" alt="3" src="3.png"></a><br>
<br>
To connect with Max's demo, we can load in his data about cities in Ghana.<br>
<br>
```
ghana_cities &lt;- read.csv("ghana_city_pop.csv")
```
<br>
<br>
We'll pull in a Google map of Ghana and then put dots for the cities, sized based on estimated 2013 population.<br>
<br>
```
ghanamap &lt;- qmap("Ghana", zoom = 7)
ghanamap + geom_point(data = ghana_cities,
  aes(x = longitude, y = latitude,
      size = Estimates2013), color = "red") +
  theme(legend.position = "none")
```
<br>
<br>
<a href="4.png"><img class="aligncenter size-full wp-image-811" alt="4" src="4.png"></a><br>
<br>
Another useful feature to note is the&#160;<code>gglocator</code>&#160;function, which let's you click on a map and get the latitude and longitude of where you clicked.<br>
<br>
```
gglocator()
```
<br>
<br>
This is all the tip of the iceberg. You'll probably want to know more about&#160;<a href="http://docs.ggplot2.org/"><code>ggplot2</code></a>&#160;if you're going to make extensive use of&#160;<code>ggmap</code>.&#160;<a href="http://rmaps.github.io/"><code>RMaps</code></a>&#160;is another (and totally different) great way to do maps in&#160;<code>R</code>.<br>
<br>
This document is also <a href="http://rpubs.com/ajschumacher/13583">available on RPubs</a>.<br>
</div>


*This post was originally hosted elsewhere.*
