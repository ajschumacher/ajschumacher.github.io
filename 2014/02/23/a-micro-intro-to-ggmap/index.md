# A micro-intro to ggmap



This describes what we did in the break-out session I facilitated for the illustrious&#160;<a href="http://richmanmax.com/">Max Richman</a>'s Open Mapping workshop at&#160;<a href="http://dc.opendataday.org/">Open Data Day DC</a>. For more detail, I recommend the original&#160;<a href="http://stat405.had.co.nz/ggmap.pdf">paper on&#160;<code>ggmap</code></a>.

<code>ggmap</code>&#160;is an&#160;<code>R</code>&#160;package that does two main things to make our lives easier:

<ul>
	<li>It wraps a number of APIs (chiefly the&#160;<a href="https://developers.google.com/maps/">Google Maps API</a>)&#160;to conveniently facilitate geocoding and raster map access in&#160;<code>R</code>.</li>
	<li>It operates together with&#160;<code>ggplot2</code>, another&#160;<code>R</code>&#160;package, which means all the power and convenience of the&#160;<a href="http://www.amazon.com/Grammar-Graphics-Statistics-Computing/dp/0387245448">Grammar of Graphics</a>&#160;is available for maps.</li>
</ul>
To install&#160;<code>ggmap</code>&#160;in&#160;<code>R</code>:

```
install.packages("ggmap")
```

Then you can load the package.

```

## Loading required package: ggplot2
```

One thing that&#160;<code>ggmap</code>&#160;offers is easy geocoding with the&#160;<code>geocode</code>&#160;function. Here we get the latitude and longitude of The World Bank:

```
(addressll &lt;- geocode(address))

##      lon  lat
## 1 -77.04 38.9
```

The&#160;<code>ggmap</code>&#160;package makes it easy to get quick maps with the&#160;<code>qmap</code>&#160;function. There are a number of options available from various sources:

```
qmap("Washington, DC", zoom = 13)
```

<a href="1.png"><img class="aligncenter size-full wp-image-808" alt="1" src="1.png"></a>

```
# An artistic map from Stamen
qmap("Washington, DC", zoom = 13, source = "stamen",
     maptype = "watercolor")
```

<a href="2.png"><img class="aligncenter size-full wp-image-809" alt="2" src="2.png"></a>

Since we were at The World Bank, here's a quick map showing where we were. This shows for the first time how&#160;<code>ggplot2</code>&#160;functions (<code>geom_point</code>&#160;here) work with&#160;<code>ggmap</code>.

```
bankmap &lt;- qmap(address, zoom = 16, source = "stamen",
                maptype = "toner")
bankmap + geom_point(data = addressll,
                     aes(x = lon, y = lat),
                     color = "red",
                     size = 10)
```

<a href="3.png"><img class="aligncenter size-full wp-image-810" alt="3" src="3.png"></a>

To connect with Max's demo, we can load in his data about cities in Ghana.

```
ghana_cities &lt;- read.csv("ghana_city_pop.csv")
```

We'll pull in a Google map of Ghana and then put dots for the cities, sized based on estimated 2013 population.

```
ghanamap &lt;- qmap("Ghana", zoom = 7)
ghanamap + geom_point(data = ghana_cities,
  aes(x = longitude, y = latitude,
      size = Estimates2013), color = "red") +
  theme(legend.position = "none")
```

<a href="4.png"><img class="aligncenter size-full wp-image-811" alt="4" src="4.png"></a>

Another useful feature to note is the&#160;<code>gglocator</code>&#160;function, which let's you click on a map and get the latitude and longitude of where you clicked.

```
gglocator()
```

This is all the tip of the iceberg. You'll probably want to know more about&#160;<a href="http://docs.ggplot2.org/"><code>ggplot2</code></a>&#160;if you're going to make extensive use of&#160;<code>ggmap</code>.&#160;<a href="http://rmaps.github.io/"><code>RMaps</code></a>&#160;is another (and totally different) great way to do maps in&#160;<code>R</code>.

This document is also <a href="http://rpubs.com/ajschumacher/13583">available on RPubs</a>.



*This post was originally hosted [elsewhere](https://planspacedotorg.wordpress.com/2014/02/23/a-micro-intro-to-ggmap/).*
