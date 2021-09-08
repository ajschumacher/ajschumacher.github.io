# Spaced repetition is _O(log n)_ sustainable

If you use [spaced repetition][] software like [Anki][] for a long
time, will you have to spend more and more time studying every day?
Yes, but the increase is [logarithmic][] with time, which is a very
slow increase. If you add ten cards a day, then after a year you do 85
reviews per day. After ten years, that goes to 118 reviews per day,
and even after 100 years, it's 152 reviews per day—still only half an
hour or so each day.

[spaced repetition]: https://en.wikipedia.org/wiki/Spaced_repetition
[Anki]: https://apps.ankiweb.net/
[logarithmic]: https://en.wikipedia.org/wiki/Time_complexity#Logarithmic_time

The major simplifying assumption here is that review delays double, so
that after _n_ days, the number of days that are contributing their
cards to today's review is _log<sub>2</sub>(n)_.

Your review delays won't be exactly that, and you won't add cards
evenly across days. For me, the estimate is close but slightly high
after 336 days of using Anki.

The average number of cards added per day is an important
multiplicative factor; my average is currently 11.3 cards per day and
trending lower. It might be higher for full-time students, but I'd be
surprised if many people stayed much above ten cards per day over
multiple years. When you stop adding so many cards, daily reviews
decrease rapidly.

I think spaced repetition study could reasonably be a lifelong
practice, like daily exercise.
