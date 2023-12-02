# Social Security is a great deal

Social Security in its current form pays out, with no volatility, a
perpetual inflation-adjusted annual yield of up to 51% on what
individuals pay in tax. 15% is common, and 5% is the worst you can
get.

I know it's not really an individual investment; younger Americans are
supposed to be supporting older ones and so on. But I had no idea how
good Social Security is for recipients, relative to how much they put
in.

Social Security pays out a percentage of your income. In monthly
terms, it's 90% of up to $1,115/month, then 32% up to $6,721/month,
then 15% up to $13,350/month. These are 2023 dollars and give the
maximum full retirement age monthly payment of $3,792.

Full retirement age for me is 67. If I start collecting Social
Security early, at 62, payments are locked in at 70% of the “full”
value. If instead I delay until 70, payments are 124%.

Social Security is based on inflation-adjusted income over your 35
highest-earning years. (If you're working your 36th year and earning
no more than any other year, this calculation won't apply.)

The last factor we need is the 6.2% tax you pay in to Social Security.
Your employer also separately pays as much, but most people don't
consider that part of their income.

So the best “return” you can get is if you have lifetime earnings so
far under $468,300 and you plan to start collecting Social Security as
late as possible:

```
0.9 * 1.24 / 35 / 0.062  # 51.4%
```

The worst non-zero return you can get is if your lifetime Social
Security earnings are already over $2.8M and you plan to collect
Social Security as soon as possible.

```
0.15 * 0.7 / 35 / 0.062  # 4.8%
```

A conservative mid-career value is likely about 15%.

```
0.32 * 1.0 / 35 / 0.062  # 14.7%
```

Social Security adjusts for inflation, so these are all returns _over_
inflation. I just can't think of anything that gets returns like this.

You get the same return on your last year's contribution before
collecting, so comparative investments can't really be allowed _any_
time for compounding. Still, most contributions will sit for some time
before the contributor starts collecting, so a full comparison could
be more complicated and depend on age at contribution etc.

Social Security is less flexible than an investing account. But is
there _anything_ that comes close to delivering what Social Security
does, for someone contributing at 60 who lives to be 90, say?


---

The calculations above may seem opaque. I simplified a little,
dropping things that cancel out. More explicitly:

```r
($100 new income this year / 35 years considered)
 * 90% income replacement factor
 * 1.24 late start factor
 = annual Social Security benefit from income
-------------------------------------------------------
($100 new income this year * 6.2% tax = tax paid on income)
```

I rearranged terms a little, and I'm still leaving out conversion
to/from monthly basis which is just a distraction.
