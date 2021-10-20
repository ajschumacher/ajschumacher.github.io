# Core RAPPOR

[RAPPOR][] (“Randomized Aggregatable Privacy-Preserving Ordinal
Response”) is really close to the classic coin-flip
[randomized response][] method, with one more layer of randomness.
It's “ordinal” in that it's every bit for itself: you can represent
histogram bins, but you can't really represent numbers in the usual
binary way. They additionally use Bloom filters to represent sets of
hashable things, which is neat too.

[RAPPOR]: https://arxiv.org/abs/1407.6981
[randomized response]: https://en.wikipedia.org/wiki/Differential_privacy#Randomized_response

[Randomized response][] works like this. Did you wash your hands?

[Randomized response]: https://en.wikipedia.org/wiki/Differential_privacy#Randomized_response

 * 25% of the time, just say “yes” regardless
 * 25% of the time, just say “no” regardless
 * 50% of the time, answer truthfully

Those percentages correspond to \\( f = 0.5 \\) in the RAPPOR
[paper][]'s notation. They call this the “permanent” step, because
it's done once per respondent.

[paper]: https://arxiv.org/pdf/1407.6981.pdf

<!--
```python
import random
```
-->

```python
def permanent_randomized(response: bool, f=0.5):
    randomizer = random.random()  # uniform on [0, 1)
    if 0 <= randomizer < f/2:  # probability f/2
        return True
    elif f/2 <= randomizer < f:  # probability f/2
        return False
    elif f <= randomizer < 1:  # probability 1 - f
        return response
```

If you get 59% positive responses with this method, 25% were just automatically saying “yes” and 34% were answering “yes” because they were being honest. Half of people were being honest, so double the 34% to find the overall true positive rate is 68%.

To let individuals report multiple times without losing privacy or being trackable, RAPPOR adds “instantaneous” randomness as well.

```python
def instantaneous_randomized(response: bool, q=0.75, p=0.5):
    randomizer = random.random()  # uniform on [0, 1)
    if response is True:
        return randomizer < q  # probability q
    elif response is False:
        return randomizer < p  # probability p
```

With the complete method, recovering the true rate gets a little more complicated; see first equation in the [paper][]'s §4.

```python
def extract_rate(raw_rate: float, f=0.5, q=0.75, p=0.5):
    return (raw_rate - p - f*q/2 + f*p/2) / ((1 - f)*(q - p))
```

And it works!

<!--
```python
random.seed(0)
```
-->

```python
true_rate = 0.68
n = 1_000_000

raw_rate = sum(
    instantaneous_randomized(
        permanent_randomized(random.random() < true_rate))
    for _ in range(n)) / n

extract_rate(raw_rate)
## 0.6807759999999998
```

RAPPOR is just doing this for any number of bits per respondent. Each
bit can have a direct interpretation like “this thing yes for this
respondent.”

RAPPOR also introduces a way of having respondents hash strings (say)
into [Bloom filters][], which is kind of neat. They show how to have
different groups of respondents use different hash functions and then
do some regression to try to overcome noise and false positives. As
far as I can tell, you have to already know the set of things you're
going to be hashing into the Bloom filter (you won't discover an
unknown unknown) but it is more efficient and flexible than defining a
separate bit for every candidate string.

[Bloom filters]: http://en.wikipedia.org/wiki/Bloom_filter

RAPPOR is used [in Chrome][], for example, and if you have really a
lot of respondents, it seems pretty good!

[in Chrome]: https://www.chromium.org/developers/design-documents/rappor
