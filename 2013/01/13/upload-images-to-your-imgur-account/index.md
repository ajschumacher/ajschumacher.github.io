# Upload images to your imgur account from the command line

If you just want to anonymously do a command line upload to imgur, use <a href="http://bartnagel.co.uk/">Bart Nagel</a>'s fairly complete <a href="http://imgur.com/tools/imgurbash.sh">imgurbash.sh</a>, available along with many other tools on <a href="http://imgur.com/apps">imgur's apps page</a>. To make it work on my Mac I installed GNU sed with <span>brew install gnu-sed</span> and changed <span>sed</span> to <span>gsed</span> in the script, and it works fine, but it doesn't connect to your imgur account.

Another approach is to pull out an imgur cookie from a browser session and then sort of just pretend to be that browser session from some programming language. Lance Pollard wrote up <a href="http://code.lancepollard.com/upload-images-to-imgur-with-ruby">something about this for Ruby</a>. It might work. To me, it's a pretty ugly way to go about it.

I had never really done anything with OAuth2, so I felt pretty victorious when I got this to work. Alternate title: "<b>Five minutes to OAuth2 uploads on imgur</b>". I presume that you already have an <a href="http://imgur.com/">imgur</a> account for the following.

Step One: <a href="https://api.imgur.com/oauth2/addclient">Register an application</a>. The application is really just you, but that's fine. Choose "Desktop" for "Application Type". You should quickly get to a success page that gives you a "Client ID" and "Client secret". These are just strings that identify you; use them in the all-caps spots in subsequent steps.

Step Two: In a browser, go to this URL:

```html
https://api.imgur.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&amp;response_type=pin
```

This is where you log in, convincing imgur that you are really you. You should quickly get to another success page that gives you a new string, this one being a "PIN".

Step Three: At the command line, enter this:

```bash
curl -X POST -F "client_id=YOUR_CLIENT_ID" -F "client_secret=YOUR_CLIENT_SECRET" -F "grant_type=pin" -F "pin=YOUR_PIN" https://api.imgur.com/oauth2/token
```

This will get you a JSON response which will include "access_token", which is the useful bit. You might also be interested in "refresh_token", but I'm not going there in this post.

Step Final: At the command line, enter this:

```bash
curl -X POST -H "Authorization: Bearer YOUR_ACCESS_TOKEN" -F "image=@PATH_TO_YOUR_IMAGE_FILE" https://api.imgur.com/3/upload
```

If cURL is talking about not being able to access your file, mess around with un-escaping spaces and stuff like that. It'll work. And this time you'll get a nice JSON response which includes an "id" and a "link" to your newly uploaded file - and that file will <i>also </i>now be appearing on your imgur account images page! This is especially good if you have a <a href="https://imgur.com/register/upgrade">pro</a> account and want your images to stay up indefinitely.

That's it! You can probably automate this further if you want. If you're building a web app, there are other better ways to interface with OAuth2. You can check the whole <a href="http://api.imgur.com/">imgur API documentation</a>.


*This post was originally hosted [elsewhere](http://planspace.blogspot.com/2013/01/upload-images-to-your-imgur-account.html).*
