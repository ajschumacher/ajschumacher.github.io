# What Matters and TF-IDF

TF-IDF is about what matters.

Consider a collection (or “corpus”, or “set”) of four sentences (or “documents”, or “strings”) made up of words (or “terms”, or “tokens”):

 1. “a cat and dog sat”
 2. “a dog and cat sat”
 3. “a cat sat and sat”
 4. “a cat killed a dog”

We’d like to do some sort of calculations. One thing we can do is transform the sentences to a “bag of words” representation, which just means we’re keeping track of what words there are but not what order they’re in. We could use binary values to represent whether a word appears or not:

```text
      a    cat    and    dog    sat   killed
1     1      1      1      1      1        0
2     1      1      1      1      1        0
3     1      1      1      0      1        0
4     1      1      0      1      0        1
```

In this representation we've lost word order, but we've also lost *term frequency*: we can't tell that sentence three has twice as much sitting as sentence two. Let's use the counts:

```text
      a    cat    and    dog    sat   killed
1     1      1      1      1      1        0
2     1      1      1      1      1        0
3     1      1      1      0      2        0
4     2      1      0      1      0        1
```

Now we can see how many times each term appears in each document.

Is it good that “killed” is given the same score as “cat”? The word “killed” is much rarer, after all; it is more “special” to sentence four. Let’s count the number of sentences that have each word, and call this the *document frequency*.

```text
      a    cat    and    dog    sat  killed
      4      4      3      3      3       1
```

We could just as well count the number of times the words appear across all documents, rather than the number of documents in which the words appear, but let’s stick with this method for now.

The document frequencies are high for words that are boring, so dividing by the document frequencies will give us low scores for boring words and high scores for interesting words:

```text
      a    cat    and   dog     sat  killed
1  0.25   0.25   0.33   0.33   0.33       0
2  0.25   0.25   0.33   0.33   0.33       0
3  0.25   0.25   0.33      0   0.67       0
4  0.50   0.25      0   0.33      0    1.00
```

These scores match the intuition that “killed” is the most important word in sentence four, and that sentence three is more about “sat” than any other sentence, and so on. In addition to making some intuitive sense, scores like these tend to work well in classification tasks and so on.

All we did was this:

\\[ \frac{\text{number of times the word is in this document}}{\text{number of documents the word is in}} \\]

Or, for short:

\\[ \frac{\text{term frequency}}{\text{document frequency}} \\]

Dividing by a thing is the same as multiplying by its inverse, \\( \frac{1}{\text{a thing}} \\), so we can call this transformation *term frequency inverse document frequency*.

This is not a very difficult idea. You may have invented it yourself at some point. But it gets so buried in terminology and secondary implementation details that people sometimes talk about it as if it were a deep and mysterious modeling technique. (It's not.)

Here's an example of how the exposition can lose people. It's from a nice [dissertation](http://www.cs.utexas.edu/~ml/papers/marlin-dissertation-06.pdf). It starts pretty good:

> “Tokens that occur frequently in a given string should have higher contribution to similarity than those that occur few times, as should those tokens that are rare among the set of strings under consideration.”

Who could disagree? Then it jumps to this:

> “The Term Frequency-Inverse Document Frequency (TF-IDF) weighting scheme achieves this by associating a weight \\( w_{v_i,s} = \frac{N(v_i,s)}{\text{max}_{v_j \in s} N(v_j,s)} \cdot \text{log} \frac{N}{N(v_i)} \\) with every token \\( v_i \\) from string \\( s \\), where \\( N(v_i, s) \\) is the number of times \\( v_i \\) occurs in \\( s \\) (term frequency), \\( N \\) is the number of strings in the overall corpus under consideration, and \\( N(v_i) \\) is the number of strings in the corpus that include \\( v_i \\) (document frequency).”

There's some notation there, and we've also thrown in two normalizations and a log. None of this is a particularly big deal, but it makes TF-IDF seem complicated. There are a lot of ways you could do the particulars of TF-IDF (the [Wikipedia page for TF-IDF](http://en.wikipedia.org/wiki/Tf%E2%80%93idf) lists even more variants) but they all do essentially what we did above by just counting and dividing.
