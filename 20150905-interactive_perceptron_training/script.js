var perceptron = new ss.perceptron();
// Initialize explicitly, since we know this is a 2d space.
perceptron.weights = [0, 0];
perceptron.bias = 0;

var width = 400;
var height = 400;
var r = 5;

var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);

var boundg = svg.append("g");
boundg.append("rect")
    .attr("x", -2 * width)
    .attr("width", 5 * width)
    .attr("y", -2 * height)
    .attr("height", 2 * height)
    .attr("fill", "blue")
    .attr("opacity", 0.2);
boundg.append("rect")
    .attr("x", -2 * width)
    .attr("width", 5 * width)
    .attr("y", 0)
    .attr("height", 2 * height)
    .attr("fill", "red")
    .attr("opacity", 0.2);
function updateColoring() {
    var a = perceptron.weights[0];
    var b = perceptron.weights[1];
    var c = perceptron.bias;
    if (a === 0) {
        if (b === 0) {
            if (c < 0) {
                // always negative
                boundg.attr("transform", "rotate(90)");
            } else {
                // always positive
                boundg.attr("transform", "");
            }
        } else {
            // horizontal boundary
            var y = -c / b;
            boundg.attr("transform", "translate(0, " + y + ")");
        }
    } else {
        if (b === 0) {
            // vertical boundary
            var x = -c / a;
            boundg.attr("transform", "translate(" + x + ", 0), rotate(-90)");
        } else {
            // nice diagonal boundary
            var x = -c / a;
            var angle = 180 * Math.atan(a/b) / Math.PI;
            var rotate = 180 - angle;
            if (b < 0) {
                rotate += 180;
            }
            console.log(rotate);
            boundg.attr("transform", "translate(" + x + "), rotate(" + rotate + ")");
        }
    }
}

var canvas = svg.append("rect")
    .attr("x", 0)
    .attr("width", width)
    .attr("y", 0)
    .attr("height", height)
    .attr("opacity", 0);

function addPoint() {
    var x = d3.event.offsetX;
    var y = d3.event.offsetY;
    var point = svg.append("circle")
            .attr("cx", x)
            .attr("cy", y)
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
        // If activated by real click, don't show context menu.
        if (d3.event) {
            d3.event.preventDefault();
        }
        // Determine label from class.
        var label;
        if (point.classed("pos")) {
            label = 1;
        } else {
            label = 0;
        }
        console.log(perceptron.weights);
        console.log(perceptron.bias);
        perceptron.train([x, y], label);
        console.log(perceptron.weights);
        console.log(perceptron.bias);
        updateColoring();
    });
}

canvas.on("click", function() {
    d3.event.preventDefault();
    addPoint("pos");
});
