# TF-IDF is about what matters

TF-IDF is *term frequency inverse document frequency*. But what does that mean?

![cat and dog](cat_and_dog.png)

<!-- Image from Wikimedia Commons: http://commons.wikimedia.org/wiki/File:Cat_and_dog.JPG -->

Consider a collection (or corpus, or set) of four sentences (or documents, or strings) made up of words (or terms, or tokens):

 1. the cat and dog sat
 2. the dog and cat sat
 3. the cat sat and sat
 4. the cat killed the dog

One thing we can do is transform this corpus to a bag of words representation, which just means we’re keeping track of what words there are but not what order they’re in. We could use binary values to represent whether a word appears or not:

```text
    the    cat    and    dog    sat   killed
1     1      1      1      1      1        0
2     1      1      1      1      1        0
3     1      1      1      0      1        0
4     1      1      0      1      0        1
```

In this representation we've lost word order, but we've also lost *term frequency*: we can't tell that sentence three has twice as much sitting as sentence two. Let's use the counts:

```text
    the    cat    and    dog    sat   killed
1     1      1      1      1      1        0
2     1      1      1      1      1        0
3     1      1      1      0      2        0
4     2      1      0      1      0        1
```

Now we can see how many times each term appears in each document.

Is it good that “killed” is given the same score as “cat” in sentence four? The word “killed” is much rarer, after all; it is more “special” to sentence four. Let’s count the number of sentences that have each word, and call this the *document frequency*:

```text
    the    cat    and    dog    sat  killed
      4      4      3      3      3       1
```

The document frequencies are high for words that are boring, so dividing by the document frequencies will give us low scores for boring words and high scores for interesting words:

```text
    the    cat    and   dog     sat  killed
1  0.25   0.25   0.33   0.33   0.33       0
2  0.25   0.25   0.33   0.33   0.33       0
3  0.25   0.25   0.33      0   0.67       0
4  0.50   0.25      0   0.33      0    1.00
```

These scores match the intuition that “killed” is a very important word. In addition to making some intuitive sense, scores like these tend to work well in machine learning tasks.

All we did was this:

\\[ \frac{\text{number of times the word is in this document}}{\text{number of documents the word is in}} \\]

Or, for short:

\\[ \frac{\text{term frequency}}{\text{document frequency}} \\]

Dividing by a number is the same as multiplying by its inverse, \\( \frac{1}{\text{a number}} \\), so we can call this transformation *term frequency inverse document frequency*.

This is not a very difficult idea. You could have invented it yourself. But it gets so buried in terminology and secondary implementation details that people sometimes talk about it as if it were a deep and mysterious modeling technique. (It's not.)

Here's an [example](http://www.cs.utexas.edu/~ml/papers/marlin-dissertation-06.pdf) of how the exposition can lose people. It starts nicely:

> “Tokens that occur frequently in a given string should have higher contribution to similarity than those that occur few times, as should those tokens that are rare among the set of strings under consideration.”

Who could disagree? Then it jumps to this:

> “The Term Frequency-Inverse Document Frequency (TF-IDF) weighting scheme achieves this by associating a weight \\( w_{v_i,s} = \frac{N(v_i,s)}{\text{max}_{v_j \in s} N(v_j,s)} \cdot \text{log} \frac{N}{N(v_i)} \\) with every token \\( v_i \\) from string \\( s \\), where \\( N(v_i, s) \\) is the number of times \\( v_i \\) occurs in \\( s \\) (term frequency), \\( N \\) is the number of strings in the overall corpus under consideration, and \\( N(v_i) \\) is the number of strings in the corpus that include \\( v_i \\) (document frequency).”

There's some notation there, and we've also thrown in two normalizations and a log. None of this is a particularly big deal, but it makes TF-IDF seem complicated. There are [a lot of ways](http://en.wikipedia.org/wiki/Tf%E2%80%93idf) you could do the particulars of TF-IDF but they all achieve essentially what we did above by just counting and dividing.

It can also be confusing when results don't match what you expect. Here is what you get by default (with [this script](tfidf.py)) from [sklearn](http://scikit-learn.org/)'s [TfidfVectorizer](http://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html):

```text
    the    cat    and    dog    sat   killed
1  0.39   0.39   0.48   0.48   0.48        0
2  0.39   0.39   0.48   0.48   0.48        0
3  0.32   0.32   0.40      0   0.79        0
4  0.63   0.31      0   0.38      0     0.60
```

The formula `sklearn` version 0.16.1 uses to compute TF-IDF is this:

\\[ \text{term frequency} \cdot \left \( \text{log} \left \( \frac{\text{number of documents} + 1}{\text{document frequency} +1} \right \) + 1 \right \) \\]

And then `sklearn` also scales the rows of the results to each have unit length.

So you could be surprised that the results of a TF-IDF implementation don't exactly match the method you were thinking of. As above, there are a lot of small choices in exactly how to calculate TF-IDF, and `sklearn` chooses one particular implementation.

---

I've seen better classification performance with TF-IDF than with raw counts, but I haven't seen a systematic comparison across various TF-IDF methods; it might be interesting to see such a comparison.

---

Thanks to [Rob Hall](https://twitter.com/hallr) for doing [work](https://github.com/ga-students/DAT_SF_13/tree/master/lectures#session-14-natural-language-processing) that helped inspire this post!
