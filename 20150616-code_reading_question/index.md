# Code Reading Question

Here's an idea for a type of question to help assess a person's skill in programming. Give the person some code to read:

```python
def norf(bar, foo):
    for baz in bar:
        if baz in foo or norf(baz, foo+[baz]):
            return True
    return False
```

This is four lines of Python.

Some of the questions you could ask:

 * What does `norf` do?
 * What are the types of the arguments `bar` and `foo`?
 * What are better names for `norf`, `bar`, `foo`, and `baz`?
 * What data structure are we working with?
 * What are alternatives for the design of this data structure?
 * What are limitations of this function?

I suspect that this could be interesting. I haven't seen anyone use interview questions of this type. I wonder how well this one would work.
