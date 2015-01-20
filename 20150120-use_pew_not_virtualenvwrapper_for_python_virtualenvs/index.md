# Use pew, not virtualenvwrapper, for Python virtualenvs

Have you noticed how good [The Hitchhiker’s Guide to Python](http://docs.python-guide.org/) is? The documentation there on [virtualenv](http://docs.python-guide.org/en/latest/dev/virtualenvs/) is exemplary.

Of course nobody wants to use virtualenvs directly, which is why virtualenvwrapper exists. But as [Lamb](http://datagrok.org/) pointed out, [Virtualenv's `bin/activate` is Doing It Wrong](https://gist.github.com/datagrok/2199506), and virtualenvwrapper doesn't do it right.

The solution is to use [pew](https://github.com/berdario/pew) instead. “pew” is not only a cute name: it stands for Python Environment Wrapper. It handle your environment elegantly. This includes not mangling your `PS1`. Of course you can still display `$VIRTUAL_ENV` information in your prompt—the way _you_ want. Also, suddenly all your virtualenv tasks are pew sub-commands, which means all you have to remember is `pew`. Typing `pew` alone shows all the pew commands, with helpful descriptions.

Don't set the `WORKON_HOME` environment variable. It's supported by pew, but the default is `~/.local/share/virtualenvs`, which is a good choice. It's consistent with [PEP 370](https://www.python.org/dev/peps/pep-0370/), and it means you don't rely on `WORKON_HOME` to find your virtualenvs, which is nice for cron.

Of course `pew` will be installed in `/usr/local/bin`—for convenience, I suggest adding a `PATH` line to your crontab. The default is `/usr/bin:/bin`, so the following adds one entry:

```
PATH=/usr/local/bin:/usr/bin:/bin
```

With that done, you can easily run via cron any Python script you want in any virtualenv you want, with concise syntax:

```
* * * * * pew in my_env ~/my_script.py
```

---

Other approaches/implementations: [sashahart/vex](https://github.com/sashahart/vex), [zimbatm/direnv](https://github.com/zimbatm/direnv)

Thanks to [Rami](https://twitter.com/necaris), [Jessica](https://twitter.com/jessicagarson), and [Francis](https://twitter.com/reconbot) for thoughts on this.
