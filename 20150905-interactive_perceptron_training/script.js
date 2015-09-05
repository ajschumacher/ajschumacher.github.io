var width = 400;
var height = 400;
var r = 5;

var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);

var canvas = svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("opacity", 0);

function addPoint(cls) {
    svg.append("circle")
        .attr("cx", d3.event.offsetX)
        .attr("cy", d3.event.offsetY)
        .attr("r", r)
        .attr("class", cls);
}

canvas.on("click", function() {
    d3.event.preventDefault();
    addPoint("pos");
});
canvas.on("contextmenu", function() {
    d3.event.preventDefault();
    addPoint("neg");
});
