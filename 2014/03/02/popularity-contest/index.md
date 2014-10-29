# Popularity Contest



As seems to happen when I have a lot to do, I got the itch this weekend to do something else. So I threw together a quick node app on heroku, using the twit module from npm and bootstrap with the superhero theme from bootswatch. It's at&#160;<a href="http://popular.herokuapp.com/">popular.herokuapp.com</a>, which I'm frankly amazed wasn't taken.

It started as a sort of joke about social media analytics and the silliness of judging things by the noise on twitter, but it's actually pretty fun. Compare whatever you want to the current Bieber rate of 198,542 tweets per day! and so on.

How does it work? It just gets the most recent 100 tweets (or all tweets) for a search and uses the time since the oldest of those and the number (usually 100) to get a time-per-tweet, which is then translated to tweets-per-day. This is the part that I think is funny: it seems like a lot of people/groups essentially make up whatever crazy calculation they want and try to sell it as social media analytics. "Well, 'impressions' is 'total reach' times a number we made up, because probably people look at the tweet that many times, right?"

Anyway, it was fun to throw this together this morning. It's liable to break, because I haven't done anything clever to ensure that my twitter API credentials don't get messed up and so on. And of course it can only handle a small rate of queries before it'll hit twitter's limits, I think.



*This post was originally hosted elsewhere.*
