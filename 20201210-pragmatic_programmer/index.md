# The Pragmatic Programmer

I read the original [Pragmatic Programmer][] years ago, and now read
the 20th anniversary edition with some of my colleagues. It was an
important book to me early in my career, and still has lots of useful
reminders and updates with the new edition.

[Pragmatic Programmer]: https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/

I wish the whole book was available as pages on the public web. It's
"written as a series of self-contained sections" in a way that would
work really well with hyperlinks.


### Quotes and notes by chapter

 * [Chapter 1: A Pragmatic Philosophy](#ch1)
 * [Chapter 2: A Pragmatic Approach](#ch2)
 * [Chapter 3: The Basic Tools](#ch3)
 * [Chapter 4: Pragmatic Paranoia](#ch4)
 * [Chapter 5: Bend, or Break](#ch5)
 * [Chapter 6: Concurrency](#ch6)
 * [Chapter 7: While You Are Coding](#ch7)
 * [Chapter 8: Before the Project](#ch8)
 * [Chapter 9: Pragmatic Projects](#ch9)
 * [Chapter 10: Postface](#ch10)


![cover](pragprog.jpg)


---

### <a name="ch1"></a>Chapter 1: A Pragmatic Philosophy


---

The "broken windows" terminology hasn't aged terribly well because of
the controversy around [broken windows policing][]; I agree broadly
with the software development message, but the term has some unwanted
connotations.

[broken windows policing]: https://en.wikipedia.org/wiki/Broken_windows_theory


---

> "Tip 9: Invest Regularly in Your Knowledge Portfolio" (page 15)

The "Knowledge Portfolio" metaphor is pretty good. I also want people
to be life-long knowledge investors.

They list five items in managing a knowledge portfolio:

 * Invest regularly
 * Diversify
 * Manage risk
 * Buy low, sell high
 * Review and rebalance


---

> "While there's a glut of short-form essays and occasionally reliable
> answers on the web, for deep understanding you need long-form
> books." (page 16)


---

> "A favorite consulting trick: ask "why?" at least five times." (page
> 18)

In [Why Curiosity Matters](https://hbr.org/2018/09/curiosity) they reference "Toyota’s 5 Whys approach."

---

> "One of the Neuro Linguistic Programming suppositions is "The
> meaning of your communication is the response you get."" (page 20)


---

### <a name="ch2"></a>Chapter 2: A Pragmatic Approach


---

They note "Meyer's _Uniform Access principle_," which [states][] that
"All services offered by a module should be available through a
uniform notation, which does not betray whether they are implemented
through storage or through computation."

[states]: https://en.wikipedia.org/wiki/Uniform_access_principle

In Python this doesn't have to mean exposing getters and setters;
using [@property][] is a good solution.

[@property]: https://docs.python.org/3/library/functions.html#property


---

> "_If it isn't easy, people won't do it._" (page 38)


---

> "In fact, this book is written in Markdown, and typeset directly
> from the Markdown source." (page 45)

How? How do they do footnotes, etc.? Sounds like ConTeXt can do some
part... But presumably they have their own custom stuff. Lots of
details, I imagine.


---

> "Model building can be both creative and useful in the long term.
> Often, the process of building the model leads to discoveries of
> underlying patterns and processes that weren't apparent on the
> surface." (page 67)


---

> "During the calculation phase, you get answers that seem strange.
> Don't be too quick to dismiss them. If your arithmetic is correct,
> your understanding of the problem or your model is probably wrong.
> This is valuable information." (page 68)


---

### <a name="ch3"></a>Chapter 3: The Basic Tools


---

The footnote on page 100 cites [What Does Doodling do?][], which seems
kind of neat. I don't completely trust the result in the paper though,
or at least the interpretation. Here's the abstract:

[What Does Doodling do?]: http://pignottia.faculty.mjc.edu/math134/homework/doodlingCaseStudy.pdf

> Doodling is a way of passing the time when bored by a lecture or
> telephone call. Does it improve or hinder attention to the primary
> task? To answer this question, 40 participants monitored a
> monotonous mock telephone message for the names of people coming to
> a party. Half of the group was randomly assigned to a ‘doodling’
> condition where they shaded printed shapes while listening to the
> telephone call. The doodling group performed better on the
> monitoring task and recalled 29% more information on a surprise
> memory test. Unlike many dual task situations, doodling while
> working can be beneficial. Future research could test whether
> doodling aids cognitive performance by reducing daydreaming


---

### <a name="ch4"></a>Chapter 4: Pragmatic Paranoia


---

> "DBC [Design By Contract] is more efficient (and DRY-er) than
> defensive programming, where _everyone_ has to validate data in case
> no one else does." (page 108)


---

> "By expressing the domain of the square root function in the
> precondition of the `sqrt` routine, you shift the burden of
> correctness to the caller–where it belongs." (page 110)

And other "fail fast" kinds of things... "crashing early" etc...


---

In Python, `with open` blocks help implement "Finish What You Start"
(page 118).


---

### <a name="ch5"></a>Chapter 5: Bend, or Break

This chapter is _very substantially_ different from the original
version, and in interesting ways. Here's a quick summary of the
content:

 * Decoupling
 * Events
     * Finite State Machines
     * The Observer Pattern
     * Publish/Subscribe
     * Reactive Programming and Streams
 * Functional programming
 * Don't use inheritance
     * Interfaces and protocols
     * Delegation
     * Mixins and traits
 * Configuration (as a service)


---

> "When we try to pick out anything by itself, we find it hitched to
> everything else in the Universe." (page 130, quoting John Muir, My
> First Summer in the Sierra)


---

On page 148, they list files such as `dry.pml` which I guess means
they write using "Pragmatic Markup Language" as their custom
Markdown...


---

> "Do you program in an object-oriented language? Do you use
> inheritance?
>
> "If so, stop! It probably isn't what you want to do." (page 158)


---

### <a name="ch6"></a>Chapter 6: Concurrency


---

> "[Concurrency] is often implemented using things such as fibers,
> threads, and processes." (page 169)

I wasn't familiar with [fibers][]. Cute name. Connected to coroutines
(cooperative multitasking). Seems like fibers is common terminology in
Ruby.

[fibers]: https://en.wikipedia.org/wiki/Fiber_(computer_science)


---

> "... messaging systems (such as Kafka and NATS)" (page 189)

I wasn't familiar with [NATS][]. It's a messaging system. According
the [FAQ][]:

[NATS]: https://en.wikipedia.org/wiki/NATS_Messaging
[FAQ]: https://docs.nats.io/faq

> "NATS stands for Neural Autonomic Transport System. Derek Collison
> conceived NATS as a messaging platform that functions like a central
> nervous system."


---

### <a name="ch7"></a>Chapter 7: While You Are Coding


---

"Testing is not about finding bugs, it’s about getting feedback on
your code: aspects of design, the API, coupling, and so on. That means
that the major benefits of testing happen when you think about and
write the tests, not just when you run them." (page 325)


---

"If you’re not sure why it works, you won’t know why it fails." (page
339)


---

> "Tip 68: Build End-to-End, Not Top-Down or Bottom Up" (page 366)


---

> "Testing, design, coding—it’s all programming." (page 374)


---

Property-based testing seems like fuzzing...


---

That NIST thing on having reasonable password rules:
https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-63b.pdf


---

### <a name="ch8"></a>Chapter 8: Before the Project

This is good stuff, but I didn't pull out specific notes. It's on
working in tight feedback loops rather than trying to "collect
requirements" all at the beginning.


---

### <a name="ch9"></a>Chapter 9: Pragmatic Projects


---

> "Programmers are a bit like cats: intelligent, strong willed,
> opinionated, independent, and often worshiped by the net." (page
> 437)


---

> "Tip 85: Schedule It to Make It Happen" (page 441)


---

[Mythical Unit Test Coverage](https://www.researchgate.net/publication/324959836_Mythical_Unit_Test_Coverage)
is neat. Abstract:

> "It is a continuous struggle to understand how much a product should
> be tested before its delivery to the market. Ericsson, as a global
> software development company, decided to evaluate the adequacy of
> the unit-test-coverage criterion that it had employed for years as a
> guide for sufficiency of testing. Naturally, one can think that if
> increasing coverage decreases the number of defects significantly,
> then coverage can be considered a criterion for test sufficiency. To
> test this hypothesis in practice, we investigated the relationship
> of unit-test-coverage measures and post-unit-test defects in a large
> commercial product of Ericsson. The results indicate that high
> unit-test coverage did not seem to be any tangible help in producing
> defect-free software."


---

> "Even though your title might be some variation of “Software
> Developer” or “Software Engineer,” in truth it should be “Problem
> Solver.” That’s what we do, and that’s the essence of a Pragmatic
> Programmer. We solve problems." (page 464)


---

> "Anonymity, especially on large projects, can provide a breeding
> ground for sloppiness, mistakes, sloth, and bad code." (page 466)


---

### <a name="ch10"></a>Chapter 10: Postface


---

> "Tip 99: Don’t Enable Scumbags" (page 472)
