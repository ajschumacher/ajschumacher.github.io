# Data done wrong: The only-most-recent data model


It's not very uncommon to encounter a database that only stores the most recent state of things. For example, say the database has one row per&#160;<a href="http://en.wikipedia.org/wiki/Monarch_butterfly"><em>Danaus plexippus</em></a> individual. The database could have a column called <em>stage</em>&#160;which would tell you if an individual is currently a caterpillar or a butterfly, for instance.

This kind of design might seem fine for some application, but you have no way of seeing what happened in the past. When did that individual <em>become</em> a butterfly? (Conflate, for the moment, the time of the change in the real world and the time the change is made in the database - and say that the change is instantaneous.) Disturbingly often, you find after running a timeless database for some time that you actually <em>do</em> need to know about how the database&#160;changed over time - but you haven't got that information.

There are at least two approaches to this problem. One is to store <em>transactional</em> data. In the <em>plexippus</em> example this could mean storing one row per life event per individual, with a date-time of database execution. The current known state of each individual can still be extracted (or maintained as a separate table). Another approach is to use a database that tracks all changes; the idea is something like version control for databases, and one implementation with a philosophy like this is <a href="http://www.datomic.com/">datomic</a>.

With a record of transactional data or a database that stores all transactions, you can query back in time: what was the state of the database at such-and-such time in the past? This is much better than our original setup. We don't forget what happened in the past, and&#160;we can reproduce our work later even if the data is added to or changed. Of course this requires that the historical records not be themselves modified - the transaction logs must be <em>immutable</em>.

This is where simple transactional designs on&#160;traditional databases fail. If someone erroneously enters on April 4th that an individual became a butterfly on April 3rd, when really the transformation&#160;occurred on April 2nd, and this mistake is only realized on April 5th, there has to be a way of adding <em>another</em> transaction to indicate the update - not altering the record entered on April 4th. This can quickly become confusing - it can be a little mind-bending to think about data about dates which changes over time. The update problem is a real headache.&#160;I would like to find a good solution to this.

<a href="monarch_in_may.jpg"><img class="aligncenter size-large wp-image-878" src="monarch_in_may.jpg" alt="Monarch_In_May"></a>



*This post was originally hosted elsewhere.*
