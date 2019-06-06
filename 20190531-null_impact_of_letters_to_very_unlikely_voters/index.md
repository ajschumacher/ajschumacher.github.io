# Null impact of letters to very unlikely voters

Before the November 2018 election, I sent 2,181 personalized letters to very unlikely voters registered in New York's state senate district 5, encouraging them to vote. I sent 1,180 "birthday letters" in the months before the election, and 1,001 more conventional letters shortly before the election. Unfortunately, I didn't meaningfully increase voting rates in either group compared to control. This null result supports the conventional wisdom that extremely low-propensity voters are not optimal targets for get-out-the-vote efforts.

```
| Group           | Total | Voted | % Voted |
|-----------------|-------|-------|---------|
| Control         | 3,135 | 349   | 11.13%  |
| Birthday letter | 1,180 | 140   | 11.86%  |
| Timely letter   | 1,001 | 111   | 11.09%  |
```

**Statistical analysis**: These results are not distinguishable. The best p-value I get is 0.25. The treatments are very similar, but one "effect" is positive and the other negative.

**Group selection**: Using a 2018-07-20 voter file for NY SD5, I selected active registered Democrats who had voted at least once but not voted in the last five years. Back-testing showed equivalent groups had historically voted at low rates in midterm elections: 9%, 8%, and 4% in 2006, 2010, and 2014, respectively.

**Rationale**: I hoped that by communicating with more people who wouldn't otherwise vote, more could be swayed. I was aware of the common practice of targeting people judged to be around 50% likely to vote, but I hoped to find a novel result, and thought that especially in the particularly high-saliency 2018 midterm, my approach could work.

**Birthday letter**: To encourage engagement, I thought it would be fun to send birthday letters. This experiment group was the subset of the larger group with birthdays from August 19 to November 6. The letters had brief birthday greetings before the pro-voting message, and a "happy birthday" sticker on the outside of the hand-addressed envelopes. Letters were mailed a week before each birthday.

**Timely letter**: These letters were nearly identical to birthday letters, but with generic greetings and no stickers. They were mailed a week before the election. This group was a random selection from the larger group not selected for birthday letters. (The remainder became the control group, not receiving any letter.) Research suggests timely messaging should be _more_ effective, making the outcome of this treatment even more discouraging.

**Deliverability**: I got 8% of letters bounced back to my address, which I hope is high for this kind of campaign. Of bounces, 6% voted. (I wouldn't read much into this.)

**Direct response**: Letters included my personal mailing and email addresses. I had hoped to make a person-to-person connection with voters. I heard back from three people:

 * One person was an active voter who had moved, but family at his
   previous address got the letter to him. He emailed and was very
   supportive.
 * One person found me on Twitter and was briefly curious about the
   project.
 * The mother of a letter's intended recipient emailed to say she was
   pro-voting but upset that I had the address and birthday of her
   daughter.

**Results data**: I used a 2019-02-28 voter file for NY SD5. Voters were re-identified by New York State Board of Elections voter ID.

**Conclusions**: I wouldn't do this again. It was a learning experience, and it made me feel like I was doing something at the time. The overall change in turnout from 2014 to 2018 was dramatically greater than any effect ever achieved by a postal get-out-the-vote effort, which makes me think other influences are important.
