# A Great Python Book explains Hash Tables

[Introduction to Computation and Programming Using Python](http://mitpress.mit.edu/books/introduction-computation-and-programming-using-python-0) is the book you should get if you think you want to learn Python. It packs in tons of sophisticated content and makes it accessible, not dumbed down.

[![Introduction to Computation and Programming Using Python](cover.jpg)](http://mitpress.mit.edu/books/introduction-computation-and-programming-using-python-0)

This book seems to be something of a hidden gem. It isn't what comes up first when you search for Python resources. It doesn't have a lot of flash or promotion behind it. Of course it does have the weight of its publisher, The MIT Press. And there's the blurb on the back cover from Hal Abelson, coauthor of [Structure and Interpretation of Computer Programs](https://mitpress.mit.edu/sicp/). So there are clear signs of the book's quality.

One example of what's good about this book is the explanation of _hashing_. This is a very important topic, but it has a little bit of complexity to it and so it's often almost entirely omitted when teaching people to code. This is the depth sometimes given in introductory Python courses:

```python
# A Python dictionary is a set of key-value pairs
my_dict = {'a_key': 'a_value', 'another_key': 'another_value'}
# which allows access to the values via the keys (lookup)
my_dict['another_key']  # 'another_value'
# This data structure is also known as a `map` or `hash-map`
```

That's true, and you can start to use the language functionality with that, but it doesn't help you understand the underlying key idea. Below is part of the treatment from _Introduction to Computation and Programming Using Python_, in section 10.3 _Hash Tables_:

<section style="font-family: sans-serif">

<p>... [Python] dictionaries use a technique called hashing to do the lookup in time that is nearly independent of the size of the dictionary. The basic idea behind a <strong>hash table</strong> is simple. We convert the key to an integer, and then use that integer to index into a list, which can be done in constant time. In principle, values of any immutable type can be easily converted to an integer. After all, we know that the internal representation of each object is a sequence of bits, and any sequence of bits can be viewed as representing an integer.  For example, the internal representation of <code>'abc'</code> is the string of bits 011000010110001001100011, which can be viewed as a representation of the decimal integer 6,382,179. Of course, if we want to use the internal represntation of strings as indices into a list, the list is going to have to be pretty darn long.</p>

<p>What about situation swhere the keys are already integers? Imagine, for the moment, that we are implementing a dictionary all of whose keys are U.S. Social Security numbers. (A United States Social Security number is a nine-digit integer.) If we represented the dictionary by a list with 10<sup>9</sup> elements and used Social Security numbers to index into the list, we could do lookups in constant time. Of course, if the dictionary contained entires for only ten thousand (10<sup>4</sup>) people, this would waste quite a lot of space.</p>

<p>Which gets us to the subject of hash functions. A <strong>hash function</strong> maps a large space of inputs (e.g., all natural numbers) to a smaller space of outputs (e.g., the natural numbers between 0 and 5000). Hash functions can be used to convert a large space of keys to a smaller space of integer indices.</p>

<p>Since the space of possible outputs is smaller than she space of possible inputs, a shash function is a <strong>many-to-one mapping</strong>, i.e., multiple different inputs may be mapped to the same output. When two inputs are mapped to the same output, it is called a <strong>collision</strong>—a topic which we will return to shortly. A good hash function produces a <strong>uniform distribution</strong>, i.e., every output in the range is equally probable, which minimizes the probability of collisions.</p>

<p>Designing good hash functions is surprisingly challenging. The problem is that one wants the outputs to be uniformly distributed given the expected distribution of inputs. Suppose, for example, that one hashed surnames by performing some calculation on the first three letters. In the Netherlands, where roughly 5% of surnames begin with “van” and another 5% with “de,” the distribution would be far from uniform.</p>

<p>Figure 10.6 uses a simple hash function (recall that <code>i%j</code> returns the remainder when the integer <code>i</code> is divided by the integer <code>j</code>) to implement a dictionary with integers as keys.</p>

<p>The basic idea is to represent an instance of class <code>intDict</code> by a list of <strong>hash buckets</strong>, where each bucket is a list of key/value pairs. By making each bucket a list, we handle collisions by storing all of the values that hash to the same bucket in the list.</p>

<p>The hash table works as follows: The instance variable <code>buckets</code> is initialized to a list of <code>numBuckets</code> empty lists. To store or look up an entry with key <code>dictKey</code>, we use the hash function <code>%</code> to convert <code>dictKey</code> into an integer, and use that integer to index into <code>buckets</code> to find the hash bucket associated with <code>dictKey</code>. We then search that bucket (which is a list) linearly to see if there is an entry with the key <code>dictKey</code>. If we are doing a lookup and there is an entry with the key, we simply return the value stored with that key. If there is no entry with that key, we return <code>None</code>. If a value is to be stored, then we either replace the value in the existing entry, if one was found, or append a new entry to the bucket if none was found.</p>

<p>There are many other ways to handle collisions, some considerably more efficient than using lists. But this is probably the simplest mechanism, and it works fine if the hash table is big enough and the hash function provides a good enough approximation to a uniform distribution.</p>

<p>Notice that the <code>__str__</code> method produces a representation of a dictionary that is unrelated to the order in which elements were added to it, but is instead ordered by the values to which the keys happen to hash. This explains why we can't predict the order of the keys in an object of type <code>dict</code>.</p>

<p><strong>Figure 10.6 Implementing dictionaries using hashing</strong></p>

```python
class intDict(object):
    """A dictionary with integer keys"""

    def __init__(self, numBuckets):
        """Create an empty dictionary"""
        self.buckets = []
        self.numBuckets = numBuckets
        for i in range(numBuckets):
            self.buckets.append([])

    def addEntry(self, dictKey, dictVal):
        """Assumes dictKey an int. Adds an entry."""
        hashBucket = self.buckets[dictKey%self.numBuckets]
        for i in range(len(hashBucket)):
            if hashBucket[i][0] == dictKey:
                hashBucket[i] = (dictKey, dictVal)
                return
        hashBucket.append((dictKey, dictVal))

    def getValue(self, dictKey):
        """Assumes dictKey an int. Returns entry associated
           with the key dictKey"""
        hashBucket = self.buckets[dictKey%self.numBuckets]
        for e in hashBucket:
            if e[0] == dictKey:
                return e[1]
        return None

    def __str__(self):
        result = '{'
        for b in self.buckets:
            for e in b:
                result = result + str(e[0]) + ':' + str(e[1]) + ','
        return result[:-1] + '}' #result[:-1] omits the last comma
```

</section>

The text goes on to show a further example and explanation of how the `intDict` works.

The selection above does depend on knowing something about what “constant time” means, and possibly “immutable.” But if you were reading the book, you would have learned these already.

The organization and exposition is really extraordinary. Even in just the small hashing section above, there’s a sequence of three or four concrete examples to motivate the thinking, and then it leads into an understandable implementation. This is phenomenal educational writing.

This is [the book](http://mitpress.mit.edu/books/introduction-computation-and-programming-using-python-0) for people who want to learn.
