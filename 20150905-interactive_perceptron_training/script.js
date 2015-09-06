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

function addPoint() {
    var point = svg.append("circle")
            .attr("cx", d3.event.offsetX)
            .attr("cy", d3.event.offsetY)
            .attr("r", r)
            .attr("class", "pos");
    point.on("click", function() {
        d3.event.preventDefault();
        if (point.classed("pos")) {
            point.attr("class", "neg");
        } else {
            point.remove();
        }
    });
    point.on("contextmenu", function() {
        d3.event.preventDefault();
        alert("wubba lubba dub dub!");
    });
}

canvas.on("click", function() {
    d3.event.preventDefault();
    addPoint("pos");
});

var perceptron = new ss.perceptron();
// Initialize explicitly, since we know this is a 2d space.
perceptron.weights = [0, 0];
perceptron.bias = 0;
