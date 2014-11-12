# Install Vowpal Wabbit on Mac OS X

I failed to get <a href="http://hunch.net/~vw/">vw</a> installed during the <a href="http://planspace.org/2013/01/31/nyu-large-scale-machine-learning-big-data-lecture-one-on-line-linear-classification/">first lecture</a> of NYU's new <a href="http://cilvr.cs.nyu.edu/doku.php?id=courses:bigdata:start">big data course</a>, but I've got it installed now. Here's one way to do it:

Pre-requisites:

1. Install <a href="https://developer.apple.com/xcode/">Xcode</a> command line tools. This will give you Apple's collection of compilers and so on. You could probably get other ones if you prefer.
2. Install <a href="http://mxcl.github.com/homebrew/">Homebrew</a>. This seems to be the best Mac package manager at the moment. Once you have Homebrew everything else is easy to install.

Install steps (skip lines if you know you have things already):

```bash
brew install libtool
brew install automake
brew install boost
brew install git
git clone https://github.com/JohnLangford/vowpal_wabbit.git
cd vowpal_wabbit
```

At this point you have everything you need. You could link `glibtoolize` so you can refer to it as `libtoolize`, or you can edit the `autogen.sh` and put a '`g`' in front of `libtoolize`. Do one or the other. You're ready to go through the normal `make` process.

```bash
./autogen.sh
./configure
make
make install
```

And you have `vw` at `/usr/local/bin/vw`. Easy!


*This post was originally hosted [elsewhere](https://planspacedotorg.wordpress.com/2013/02/02/install-vowpal-wabbit-on-mac-os-x/).*
