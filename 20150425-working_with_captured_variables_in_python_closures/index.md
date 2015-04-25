# Working with Captured Variables in Python Closures

You can make [closures](http://en.wikipedia.org/wiki/Closure_%28computer_programming%29) in Python like this:

```python
def add_some(x=0):
    def adder(y):
        return x+y
    return adder

add3 = add_some(3)

print(add3(7))
## 10
```

The `adder` function "remembers" `x`.

But this will fail:

```python
def a_counter(count=0):
    def counter():
        count += 1
        return count
    return counter

the_counter = a_counter()

print(the_counter())
## UnboundLocalError: local variable 'count' referenced before assignment
```

You can't assign to `count` in there!

In Python 3, you can resolve this with `nonlocal`:

```python
def a_counter(count=0):
    def counter():
        nonlocal count
        count += 1
        return count
    return counter

the_counter = a_counter()

print(the_counter())
## 1

print(the_counter())
## 2

print(the_counter())
## 3
```

Great! I'd rather not have to specify `nonlocal`, but I'm happy to know of another feature unique to Python 3.

In Python 2, you can't get assignment of captured variables inside your closure, but you can mutate a captured variable. `¯\_(ツ)_/¯`

```python
def a_counter(count={'val': 0}):
    def counter():
        count['val'] += 1
        return count['val']
    return counter

the_counter = a_counter()

print(the_counter())
## 1

print(the_counter())
## 2

print(the_counter())
## 3
```

Hooray for closures!
