# Zombie Ideas

<ul><a id="zombie"></a>
</ul>

<script>
var path = "https://api.github.com/repos/" +
           "ajschumacher/ajschumacher.github.io/" +
           "issues?state=open&per_page=100";

fill_out_and_do([], path, 1, publish_items);

function fill_out_and_do(array, path, page, action) {
    var request = new XMLHttpRequest();
    request.onload = function () {
        array = array.concat(request.response);
        if (request.response.length != 100) {
            action(array);  // No more to get.
        } else {
            fill_out_and_do(array, path, page + 1, action);
        }
    };
    request.responseType = "json";
    request.open("GET", path + "&page=" + page);
    request.send();
}

function publish_items(array) {
    var spot = document.getElementById("zombie");
    subset = choose(array, 8);
    subset.map(element => spot.insertAdjacentHTML('afterend',
                                                  item_html(element)));
}

function choose(array, number) {
    return array.map(element => [element, Math.random()])
                .sort((a, b) => {return a[1] < b[1] ? -1 : 1;})
                .slice(0, number)
                .map(element => element[0]);
}

function item_html(object) {
    return '<li><a href="' + object.html_url + '">#' +
           object.number + '</a> ' + object.title + '</li>';
}
</script>

### What is this?

Sometimes I put ideas in [my blog's GitHub Issues][] "for later"—but
then I don't look at them any more. It's an idea graveyard. So this
hits the GitHub API and randomly shows eight old ideas on every page
load. (View source to see code.) Maybe I'll be inspired?

[my blog's GitHub Issues]: https://github.com/ajschumacher/ajschumacher.github.io/issues

New ideas seem exciting, and urgent things get done urgently. But I do
find myself sometimes looking for something to do (like finding a show
to watch) rather than realizing I could work on one of these old
ideas.

Some ideas got so little attention that I've even forgotten what my
note for the idea means. See also [spaced repetition][]. There's also
some connection here to prioritization, to-do lists, deciding to say
no to an idea, etc...

[spaced repetition]: https://en.wikipedia.org/wiki/Spaced_repetition

Amusingly, I'd forgotten that this very idea was [#164][] "random idea
refresher" until it came up while I was testing this:

> "some way of showing you a sample of your own ideas, things to think
> about, quotes, etc."

[#164]: https://github.com/ajschumacher/ajschumacher.github.io/issues/164

I still think this is a neat idea. For the time being, this page will
replace my usual new browser tab image.
