# How I Blog, or, Colophon

I recently received a friendly email, including:

> ... tell me what your development stack is for your blog, especially
> your backend language and the frontend framework that you used. I
> find your code snippets awesome. How did you embed them in your
> blog?

Thanks for asking!

Everything that is my blog, and I do mean everything, lives in
[one git repo](https://github.com/ajschumacher/ajschumacher.github.io/)
and is (in the large) entirely custom.

In the past, I had blogs on [Blogger](https://www.blogger.com/) and
then [WordPress.com](https://wordpress.com/). My domain name used to
point to my WordPress site.

I wanted more flexibility and control, and I didn't want to be tied to
any specific provider. I didn't want my writing to be floating around
in precarious databases; I wanted it all in version control.

My blog is static. It has no database or backend language, and can be
served by any conventional HTTP server. It is currently served via
[GitHub Pages](https://pages.github.com/).

I looked at a couple standard
[static site generators](https://www.staticgen.com/) and decided that
I hated them all. My main complaint was that I didn't want to put what
[Jekyll](http://jekyllrb.com/) calls "front matter" in my posts.

I wanted to write just
[markdown](https://daringfireball.net/projects/markdown/), usually. I
wanted as much as possible to not be tied to a particular static site
generator. And I like the idea of having a single and simple source of
truth. I even considered [Jr](https://github.com/Xeoncross/jr), the
"static static site generator", because it doesn't even generate HTML
files, but there you have to put a `<script>` tag in every post, which
is annoying and sort of an ugly hack anyway. (View source at the
[Jr demo](http://xeoncross.github.io/jr/) to see what I mean.)

More or less, I thought about how I wanted to write a blog post, and
then wrote a Python script to make it work.

Here's my blogging process. I go to my local blog repo directory,
start a local web server, and make a new subdirectory:

```bash
cd ~/ajschumacher.github.io/
python -m SimpleHTTPServer
mkdir 20160209-how_i_blog
cd 20160209-how_i_blog
```

Everything for a post goes in the post directory. That includes
(usually) a markdown file and a generated HTML file, any images that
appear in the post, and (more rarely) other HTML, JavaScript, and so
on. I really like having _everything_ together in that directory. I
don't want to have to coordinate across multiple directories when I'm
writing a post, and I want each post to be self-contained when it's
finished.

I put the date of the post in the directory name. My Python script
finds that date and inserts it into the generated HTML, which will be
`index.html` in the post's directory.

It's an HTTP server convention to serve `index.html` when you request
the directory; this mechanism satisfies my preference for having
semantic URLs without artifacts of an underlying technology. Think
about how you feel when you're at a `.aspx` URL. Gross.

```bash
emacs index.md
```

I edit `index.md` in the post's directory. The only rule is that the
first line is the title. My Python script looks for that line to make
into the headline in `index.html`, above the date.

My blog is put together mostly by one script, [make_page.py](https://github.com/ajschumacher/ajschumacher.github.io/blob/master/make_page.py). It uses a [Python implementation of markdown](https://pypi.python.org/pypi/Markdown), plus a custom hack to support [GitHub-style fenced code blocks](https://help.github.com/articles/creating-and-highlighting-code-blocks/), which I like. I also hack around to support [LaTeX](https://www.latex-project.org/)-style equations via [MathJax](https://www.mathjax.org/), so I can write \\(e^{i\pi}+1=0\\) as easily as `\\(e^{i\pi}+1=0\\)`.

For presentations, I wanted to be able to write a single markdown file and then have both an article for reading and slides for presenting. So if `make_page.py` sees any lines with just five hyphens, it recognizes them as demarcating a slide, and then generates a [big](https://github.com/tmcw/big) HTML/JS-based presentation in `big.html`. For example, you can [read this](http://planspace.org/20141117-well_used_simple_tools/), but if I'm giving it as a presentation I can [show this](http://planspace.org/20141117-well_used_simple_tools/big.html). Spoiler alert: If you type the [Konami code](http://code.snaptortoise.com/konami-js/) from the [post](http://planspace.org/20141117-well_used_simple_tools/), it automatically takes you to the [slides version](http://planspace.org/20141117-well_used_simple_tools/big.html).

The styling for my blog is a hodge-podge of CSS, with main colors the inverse of the [Zenburn](https://github.com/bbatsov/zenburn-emacs) color scheme. I use [highlight.js](https://highlightjs.org/) to make code blocks looks nice. I like highlight.js a lot, except that it colors some things I wish it wouldn't, like the numbers in the code block above. Spoiler alert: I use [CSShake](https://elrumordelaluz.github.io/csshake/) to make the arrow at the top of my [root page](/) move around when you mouse over it.

I eventually wrote [make_rss.py](https://github.com/ajschumacher/ajschumacher.github.io/blob/master/make_rss.py), which generates an `rss.xml` file. Somebody told me they liked RSS. I'm not completely sure it totally works with images and relative paths and so on, or that anybody uses RSS any more.

I guess I'll mention that I use [Google Analytics](https://www.google.com/analytics/) so I can see if anybody goes to my blog. Some people do. It gets more visitors than my old [naldaramjui](http://www.naldaramjui.com/) project, but fewer pageviews. Just a few posts generate the bulk of the visits, and usually not the best ones.

Oh, remember those old Blogger and WordPress blogs I had? I exported them to XML and then wrote scripts to convert that content to work with my current system. It was annoying, but I was able to preserve the URLs from the WordPress blog, so I was pretty happy about that.

I usually write most of a post, and then revise while iteratively building it and looking at how it looks in a browser. This is sort of too much work, but I feel like the distance I get by switching from editor to browser helps me to see what I'm writing with fresh eyes, to some extent. So I'll run this many times, switching to a browser and then back to editor between runs:

```bash
../make_page.py
```

Since switching to my current blog system, updates to the [index](/)
listing all my posts are always done manually. This is, again, more
work than it really needs to be, but it gives me very explicit control
over what appears in that index and how. (Not that I'm very creative
about it.)

So after all the edits to markdown files are complete, the release
process for a new post goes like this:

```bash
../make_page.py
git add index.md index.html  # and any other files for the post
cd ..
./make_page.py
git add index.md index.html  # this is the root index
./make_rss.py
git add rss.xml
git commit -m 'new post about how my blog works'
git push
```

And that's all there is to it! I do use [github issues](https://github.com/ajschumacher/ajschumacher.github.io/issues) to keep track of post and other blog enhancement ideas, but I also put a lot of things there and never return to them.
