#!/usr/bin/env python

from sklearn.feature_extraction.text import TfidfVectorizer
import pandas as pd

corpus = [
    "the cat and dog sat",
    "the dog and cat sat",
    "the cat sat and sat",
    "the cat killed the dog",
]

ordered_vocabulary = 'the cat and dog sat killed'.split()

transformer = TfidfVectorizer()
tfidf = transformer.fit_transform(corpus).toarray().round(2)
tfidf = pd.DataFrame({term: tfidf[:, transformer.vocabulary_[term]]
                      for term in ordered_vocabulary})
tfidf = tfidf[ordered_vocabulary]

print tfidf
