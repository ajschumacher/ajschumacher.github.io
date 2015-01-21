# Use pew, not virtualenvwrapper, for Python virtualenvs

Have you noticed how good [The Hitchhiker’s Guide to Python](http://docs.python-guide.org/) is? The documentation there on [virtualenv](http://docs.python-guide.org/en/latest/dev/virtualenvs/) is exemplary.

Of course nobody wants to use virtualenvs directly, which is why virtualenvwrapper exists. But as [Lamb](http://datagrok.org/) pointed out, [Virtualenv's `bin/activate` is Doing It Wrong](https://gist.github.com/datagrok/2199506), and virtualenvwrapper doesn't do it right either. Also, it's annoying to run env'ed Python via [cron](http://en.wikipedia.org/wiki/Cron).

The solution is to use [pew](https://github.com/berdario/pew) instead. The Python Environment Wrapper (pew) handles your environment elegantly. This includes not mangling your `PS1`, though you can still display `VIRTUAL_ENV` information in your prompt if you want, and however you want. Also, suddenly all your virtualenv tasks are pew sub-commands, which means all you have to remember is `pew`. Typing `pew` alone shows all the pew commands, with helpful descriptions.

I no longer set the `WORKON_HOME` environment variable. This means pew will use the default `~/.local/share/virtualenvs`, which is a good choice. It's consistent with [PEP 370](https://www.python.org/dev/peps/pep-0370/), and it means you don't rely on `WORKON_HOME` to find your virtualenvs, which is nice for cron.

The location of `pew` is `/usr/local/bin`. For convenience, I suggest adding a `PATH` line to your crontab. The default `PATH` is `/usr/bin:/bin`, so the following adds one entry:

```
PATH=/usr/local/bin:/usr/bin:/bin
```

With that done, you can easily run any Python script you want in any virtualenv you want, via cron, with concise syntax:

```
* * * * * pew in my_env my_script.py
```

The example assumes `my_script.py` is in your home directory, executable, and with the standard `#!/usr/bin/env python` shebang.

I find this to be a very nice setup: `pew workon my_env` and develop `my_script.py` however I want, and `pew in my_env my_script.py` to run in that virtualenv from cron or anywhere else.

---

Related tools: [virtualenv](https://virtualenv.pypa.io/), [virtualenvwrapper](https://virtualenvwrapper.readthedocs.org/), [vex](https://github.com/sashahart/vex), [direnv](https://github.com/zimbatm/direnv), probably more...

Thanks to [Jessica](https://twitter.com/jessicagarson), [Rami](https://twitter.com/necaris), and [Francis](https://twitter.com/reconbot) for thoughts on this.
