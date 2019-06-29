# Using Pipenv

If you use Python, you should use [Pipenv][] for
environment/requirement management.

[Pipenv]: https://docs.pipenv.org/en/latest/


---

### Installing

Do you have Pipenv installed? (Try `which pipenv`.) If you don't have
it, install it:

```bash
$ pip install --user pipenv
```

Now you can read `pipenv --help`, but I'll continue to highlight
common tasks.


---

### Existing project

Is there an existing `Pipfile`? To get things installed, run this in
the project directory:

```bash
$ pipenv sync
```


---

### New project

Starting a new project? There's no explicit "new" command, but you can
do this:

```bash
$ pipenv --python 3.7
```

You can also skip that and just start installing things.

Keep `Pipfile` and `Pipfile.lock` in version control.


---

### Installing your requirements

Just use `pipenv` instead of `pip` (or other alternatives).

```bash
$ pipenv install some_cool_python_package
```

`Pipfile` and `Pipfile.lock` will be kept up to date automatically.


---

### Development requirements

Pipenv keeps dev packages (like [Pylint](https://www.pylint.org/), for
example) separate. Just use the `--dev` flag:

```bash
$ pipenv install --dev some_cool_python_package
$ pipenv sync --dev  # install base AND dev packages
```


---

### Running things

Just use `pipenv run` a lot.

```bash
pipenv run python whatever.py --etc
```


---

### That's it!

Pipenv does a lot for you, while requiring very little from you.

I do have more thoughts though...


---

### Why is it good?

Without Pipenv, maybe you track big-picture requirements in
`setup.py`'s `install_requires`, and/or elsewhere. Maybe you have a
`requirements.txt` so you have known-good exact versions of
everything. Maybe another such file for dev requirements. And you
probably have to remember to take separate actions to keep these all
up to date and in sync. The pain! The mistakes!


---

### Working directory

I don't generally love magic based on my current working directory,
but Pipenv has won me over. I appreciate that it's explicit, at least.
No environment variables get automatically changed when you change
directories, for example. You have to run some `pipenv` command to do
anything with the environment corresponding to where you are on disk.


---

### History

I used to [advocate for Pew][], so I was interested to see that Pipenv
is a kind of descendant of Pew. Pipenv's implementation used to rely
on Pew, even.

[advocate for Pew]: /20150120-use_pew_not_virtualenvwrapper_for_python_virtualenvs/

You can get a shell in your project environment with `pipenv shell`
and it seems to work more like `pew workon` than `source activate`.

Perhaps the major workflow difference is that now `pipenv run` (like
`pew in`) is commonly used, to the exclusion of changing your shell. I
think this is a good thing in that it's more explicit and removes the
risk of forgetting what the current state of your shell is.


---

### Where's my venv, though?

Unless you mess with defaults, virtual environments are stored,
consistent with [PEP 370](https://www.python.org/dev/peps/pep-0370/),
in `~/.local/share/virtualenvs/`. They're associated with a Pipfile
via a hash of its path.

Here's a simplified version of [the hashing][]:

[the hashing]: https://github.com/pypa/pipenv/blob/08b35715c0b34461df184d907654250f60b5a0d7/pipenv/project.py#L376

```python
import hashlib, base64

def short_hash(path_to_pipfile):
    hash = hashlib.sha256(path_to_pipfile.encode()).digest()[:6]
    return base64.urlsafe_b64encode(hash)
```

So the venv for `/home/me/project/Pipfile` will be called
`project-fPIxLfK7`. You can always check your project with `pipenv
--venv`.

This does mean that if you move or otherwise rename your project
directory, Pipenv can lose track of your virtualenv — but it's super
easy to just run `pipenv sync` and you're ready to go again.
