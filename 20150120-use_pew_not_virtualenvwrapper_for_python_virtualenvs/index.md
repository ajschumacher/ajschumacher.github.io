# Use `pew`, not `virtualenvwrapper`, for Python `virtualenv`s

Have you noticed how good [The Hitchhiker’s Guide to Python](http://docs.python-guide.org/) is? The documentation there on [`virtualenv`](http://docs.python-guide.org/en/latest/dev/virtualenvs/) is exemplary.

Of course nobody wants to use `virtualenv` directly, which is why `virtualenvwrapper` exists. But as [Lamb](http://datagrok.org/) pointed out, even [Virtualenv's `bin/activate` is Doing It Wrong](https://gist.github.com/datagrok/2199506).

The solution is to use [`pew`](https://github.com/berdario/pew) instead. Not only does it handle environments more nicely, suddenly all your `virtualenv` tasks are `pew` sub-commands, which means all you have to remember is `pew`. Typing `pew` alone shows all the `pew` commands, with helpful descriptions. Oh and `pew` is not only a cute name: it stands for Python Environment Wrapper.
