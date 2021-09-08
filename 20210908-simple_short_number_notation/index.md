# Simple short number notation

Scientific notation is great, but "67B" is easier for most people than
"6.7e10". I whipped up a quick Python function that does this for
numbers up into the trillions. It always gives you back four
characters, like this:

```
                   1.1 -> '  1 '
                  98.2 -> ' 98 '
                 111.7 -> '112 '
               9_876   -> '9.9K'
          12_345_678   -> ' 12M'
     123_456_789_012   -> '123B'
 999_123_456_789_012   -> '999T'
```

Thousands as "K" might be a little unfamiliar for some audiences, but
overall I think this is pretty good, for example for labeling axes.
Here's the code:

```python
def tdn(number):
    """Short (Three-Digit Number) string representation"""
    assert 0 <= number < 9.995e14, 'outside range of defined behavior'
    if number < 1000:
        return f'{round(number):3d} '
    number /= 1000
    for symbol in 'KMBT':
        if number >= 1000:
            number /= 1000
            continue
        if number >= 10:
            return f'{number:3.0f}{symbol}'
        return f'{number:1.1f}{symbol}'
    return result
```

There's probably a nicer way to do it; feedback (and pull requests
[on GitHub][]) welcome!

[on GitHub]: https://github.com/ajschumacher/three_digit_numbers
