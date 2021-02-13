# High Concept Pitch Generator

<script src="http://d3js.org/d3.v3.min.js"></script>
<script src="http://code.jquery.com/jquery-1.9.1.min.js"></script>
<script>

d3.csv('sites.csv', function(sites){
  d3.csv('fields.csv', function(fields){
    site = sites[Math.floor(Math.random() * sites.length)].site;
    field = fields[Math.floor(Math.random() * fields.length)].field;
    $('#concept').append('"It\'s the '+site+" of "+field+'."')
  });
});

</script>

<center>
<h3>We had a three-day retreat and came up with a new startup concept:</h3>

<h1><div id="concept"></div></h1>

<h5>(reload for a new billion-dollar idea) (royalties to <a href="https://twitter.com/planarrowspace">@planarrowspace</a> and <a href="https://twitter.com/chris_whong">@chris_whong</a>)</h5>
</center>


---

This is a re-hosting of the [original][] Chris and I made in 2013. We
were reminded of it by [Pitch Deck][], which turns this idea into a
party game (with better [lists][], I think).


[original]: http://bl.ocks.org/ajschumacher/raw/5511522/
[lists]: https://gist.github.com/ajschumacher/5511522
[Pitch Deck]: http://pitchdeck.business/
