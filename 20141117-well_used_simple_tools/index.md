# Well-Used Simple Tools

*A [short talk](http://www.meetup.com/Design-Thinking-DC/events/216029412/) for [Design Thinking DC](http://www.meetup.com/Design-Thinking-DC/).*


I work with data, and the tools that are unique to what I do may or may not be interesting to you. So I'm going to show four tools that are useful for everyone, and then show some that may have less broad appeal.


-----

![](notepad.jpg)

-----

This is an image from the drafting process for this talk. Paper is my favorite invention, but I'm not going to talk about paper-based tools, except for three books. [1]

[1] *The [Bard Institute for Writing and Thinking](http://www.bard.edu/iwt/) brought me back to the immediacy of physical artifacts and influenced how I think about the creative process.*


-----

[![](bit_literacy.jpg)](http://bitliteracy.com/)

-----

My thoughts on email and to-do management come directly from [Bit Literacy](http://bitliteracy.com/), which you can get for free at [bitliteracy.com](http://bitliteracy.com/).


-----

[![](pragmatic_programmer.jpg)](https://pragprog.com/the-pragmatic-programmer)

-----

My thoughts on text and separation of concerns, among other things, were certainly influenced by [The Pragmatic Programmer](https://pragprog.com/the-pragmatic-programmer).


-----

[![](rework.png)](http://37signals.com/rework/)

-----

[ReWork](http://37signals.com/rework/), which is largely the same as the freely available [Getting Real](http://gettingreal.37signals.com/), has a lot of good ideas for working effectively. "Do everything you can to remove layers of abstraction" is one quote I like.


-----

[![](keyboard.png)](http://www.usporedi.hr/novosti/je-li-ovo-najbolja-tipkovnica-svih-vremena)

-----

Tool number one is a keyboard. You use a keyboard a lot, and you should probably use it more.

Steve Yegge has a 2008 [blog post](http://steve-yegge.blogspot.com/2008/09/programmings-dirtiest-little-secret.html) about programmers who can't touch type. You wouldn't think such people existed. But just this year, in 2014, I met such a person.

A keyboard is probably the tool you use more than any other. You need to be good at it. And once you're good at it, you can use it to be better at so many other things, through the magic of keyboard shortcuts, which you should use aggressively.


-----

[![](chrome.png)](http://www.google.com/chrome/)

-----

Tool number two is a browser. I usually use [Chrome](http://www.google.com/chrome/). I want to use [Firefox](http://firefox.com/) more, but the keyboard bindings are broken for switching tabs when you have a YouTube video up.

Often, you don't have to reach for the mouse to use your browser. I'll call out key combinations that work on my Mac; on other systems they're typically similar.

`command`+`tab` switches applications. `command`+`l` gives us the address bar. I'll type in my blog's domain, `planspace.org`. `command`+`f` finds in page. I want the post on `pca`. `esc` to leave the search. `return` to follow the link. `space` to page down a little.

Let's do it again, another way. `command`+`t` for a new tab. We want to search for `pca 3d`. `return` to search. `tab` to start exploring links. `down` to get the result we want. `return` to follow the link.

`alt`+`command`+`left` to change tabs. `command`+`w` to close the tab. `command`+`l` to get the address bar. `control`+`a` to go to the beginning of the line. `control`+`k` to kill the line. `control`+`y` to yank it back. `control`+`f` to move forward, `control`+`b` to move back.


-----

[![](gmail.png)](https://gmail.com/)

-----

Tool number three is email. [Gmail](https://gmail.com/) has been getting progressively worse, but it's still the best option. You can turn off some of the bad features, and turn on keyboard shortcuts.

A pass through email should not take a long time. It should be distinct from work, but will integrate with task management, the next tool.

Move through emails with `j` and `k`, open an email with `o`. `r` to reply, and do it immediately if it's a brief request. `[` to archive an email and move to the next one. Some emails don't require a response.

Sometimes an email represents a task, but you can't work on it until some point in the future. This is where task management is useful. I can forward (`f`) to a future date like `thursday@goodtodo.com` and the task will be tracked in the system then, so I won't see it until Thursday.

Tasks that will take longer than two minutes get moved to task management, even if they're for today.

After a pass through email, the inbox should be empty, and it's time to start doing some work.


-----

[![](goodtodo.png)](https://goodtodo.com/)

-----

Tool number four is [Good Todo](https://goodtodo.com/), which is a calendared to-do list app that integrates with email. It supplements my memory by keeping track of when I need to do things, and lets me focus on just the tasks that I'll be able to accomplish in a given day. It is way better than any other to-do application I've ever seen.

I include brief tasks that just need to be remembered and crossed off, as well as more substantial tasks. By looking at the list for the day I can decide what to work on first and what to reschedule or reconsider.

I use keyboard, browser, email, and Good Todo a lot. They have some desirable characteristics, but I want to talk about those characteristics are and show some tools that offer them even more fully. I want to talk about the Unix philosophy.


-----

Unix philosophy

-----

The Unix philosophy, to paraphrase Doug McIlroy goes as follows:

> * Use tools that do one thing well.
> * Use tools that work together.
> * Use tools that work with text, because text is universal.

I think my four simple tools follow this fairly well. But I'm going to show an example of how these principles can apply to working with data at the command line, which is much more exemplary of the Unix philosophy. [2]

[2] *For more on this family of tools, see [Data Science at the Command Line](http://datascienceatthecommandline.com/) by Jeroen Janssens.*


-----

![](emacs.png)

-----

Right now, I'll work on this "Friday sales report" task. I'll download the Excel file. Then I'll go to the command line.

Step one is getting the data out of Excel format and into text. Luckily there's a package called [csvkit](https://csvkit.readthedocs.org/), which includes `in2csv`, which will make short work of this simple file.

```bash
in2csv sales.xlsx > sales.csv
```

Now that we have text, a whole world of tools are available. I'll take off the header row with `tail`, `sort` the rows, reduce to the unique terms and count occurrences with `uniq`, then do another sort to see things in a nice order.

```bash
tail +2 sales.csv | sort | uniq -c | sort -rn
```

Notice the input and output are both text. I could work with this text further.

I'll use `R` to make a quick bar graph.

```bash
cat sales.csv | Rio -ge "g+geom_bar(aes(item))" > plot.png
```

-----

![](plot.png)

-----

In three lines, I made a text summary and a plot. It isn't just that this is easy and fast the first time. What if I get a request to do the same thing again?

I'm using my command line from inside [Emacs](http://www.gnu.org/software/emacs/), which is a text editor. [3] I'll take my three lines and make them a script. Now I can repeat what I've done whenever there's new data.

[3] *For more about Emacs, see my recent talk, [Emacs and Python](/20141007-emacs_python/).*
