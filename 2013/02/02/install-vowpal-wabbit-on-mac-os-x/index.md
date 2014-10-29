# Install Vowpal Wabbit on Mac OS X

<div>
<p>I failed to get <a href="http://hunch.net/~vw/">vw</a> installed during the <a href="http://planspace.org/2013/01/31/nyu-large-scale-machine-learning-big-data-lecture-one-on-line-linear-classification/">first lecture</a> of NYU's new <a href="http://cilvr.cs.nyu.edu/doku.php?id=courses:bigdata:start">big data course</a>, but I've got it installed now. Here's one way to do it:<br>
<br>
Pre-requisites:<br>
</p>
<ol>
<br>
	<li><span>Install <a href="https://developer.apple.com/xcode/">Xcode</a>&#160;command line tools. This will give you Apple's collection of compilers and so on. You could probably get other ones if you prefer.</span></li>
<br>
	<li>Install <a href="http://mxcl.github.com/homebrew/">Homebrew</a>. This seems to be the best Mac package manager at the moment. Once you have Homebrew everything else is easy to install.</li>
<br>
</ol>
<br>
Install steps (skip lines if you know you have things already):<br>
<pre>brew install libtool
brew install automake
brew install boost
brew install git
git clone https://github.com/JohnLangford/vowpal_wabbit.git
cd vowpal_wabbit</pre>
<br>
At this point you have everything you need. You could link&#160;<code>glibtoolize</code>&#160;so you can refer to it as <code>libtoolize</code>, or you can edit the <code>autogen.sh</code> and put a '<code>g'</code> in front of <code>libtoolize</code>. Do one or the other. You're ready to go through the normal <code>make</code> process.<br>
<pre>./autogen.sh
./configure
make
make install</pre>
<br>
And you have <code>vw</code> at <code>/usr/local/bin/vw</code>. Easy!<br>
</div>


*This post was originally hosted elsewhere.*
