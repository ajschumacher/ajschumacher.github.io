# Fix R Tcl/Tk dependency problem on Mac OS X by installing working Tcl/Tk

<div>
<p>For some reason, if you just install R on Mac OS X, you don't have a working Tcl/Tk by default. The problem manifests itself like this:<br><br><br><span>&gt; tkplot(g)</span><br><span>Loading required package: tcltk</span><br><span>Loading Tcl/Tk interface ... Error : .onLoad failed in loadNamespace() for 'tcltk', details:</span><br><span>&#160; call: dyn.load(file, DLLpath = DLLpath, ...)</span><br><span>&#160; error: unable to load shared object '/Library/Frameworks/R.framework/Versions/2.15/Resources/library/tcltk/libs/x86_64/tcltk.so':</span><br><span>&#160; dlopen(/Library/Frameworks/R.framework/Versions/2.15/Resources/library/tcltk/libs/x86_64/tcltk.so, 10): Library not loaded: /usr/local/lib/libtcl8.5.dylib</span><br><span>&#160; Referenced from: /Library/Frameworks/R.framework/Versions/2.15/Resources/library/tcltk/libs/x86_64/tcltk.so</span><br><span>&#160; Reason: image not found</span><br><span>Error in tkplot(g) : tcl/tk library not available</span><br><br>There are other functions that depend on Tcl/Tk as well. It's particularly annoying that you don't see the problem when you install or even load a library, but only when you try to use a function that depends on Tcl/Tk.<br><br>Fortunately, there's an easy solution. You need these two things:<br><br></p>
<ol>
<li>
<a href="http://xquartz.macosforge.org/">X Windows for Mac OS X</a>. You may already have this. If not, install it.</li>
<li>
<a href="http://cran.us.r-project.org/bin/macosx/tools/">A Tcl/Tk installation that actually works</a>. This will do the trick. Just install!</li>
</ol>
<div>After you have these two installed, things should work. I didn't even have to restart R.</div>
<div><br></div>
<div>
<div><span>&gt; tkplot(g)</span></div>
<div><span>Loading required package: tcltk</span></div>
<div><span>Loading Tcl/Tk interface ... done</span></div>
</div>
<br>
</div>


*This post was originally hosted [elsewhere](http://planspace.blogspot.com/2013/01/fix-r-tcltk-dependency-problem-on-mac.html).*
