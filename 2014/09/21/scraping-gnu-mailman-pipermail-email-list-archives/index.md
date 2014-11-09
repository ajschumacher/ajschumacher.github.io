# Scraping GNU Mailman Pipermail Email List Archives


I worked with&#160;<a href="http://www.codeforprogress.org/">Code for Progress</a> fellow Casidy at a recent&#160;<a href="http://codefordc.org/">Code for DC</a> civic hacknight on migrating old email list archives for the <a href="https://commotionwireless.net/">Commotion</a> mesh network project to a new system. The source system was&#160;<a href="http://www.gnu.org/software/mailman/">GNU Mailman</a> with its Pipermail web archives for several email lists such as <a href="https://lists.chambana.net/pipermail/commotion-discuss/">commotion-discuss</a>.

We used <a href="https://www.python.org/">Python</a>'s <a href="http://lxml.de/">lxml</a> for the first pass scraping of all the archive file URLs. The process was then made more interesting by the <a href="http://www.gzip.org/">gzip</a>'ing of most monthly archives. Instead of saving the gzip'ed files to disk and then gunzip'ing them, we used Python's <a href="https://docs.python.org/2/library/gzip.html">gzip</a>&#160;and <a href="https://docs.python.org/2/library/stringio.html">StringIO</a>&#160;modules. The result is the full text history of a specified email list, ready for further processing. Here's the code we came up with:

```
#!/usr/bin/env python

import requests
from lxml import html
import gzip
from StringIO import StringIO

listname = 'commotion-discuss'
url = 'https://lists.chambana.net/pipermail/' + listname + '/'

response = requests.get(url)
tree = html.fromstring(response.text)

filenames = tree.xpath('//table/tr/td[3]/a/@href')

def emails_from_filename(filename):
    print filename
    response = requests.get(url + filename)
    if filename[-3:] == '.gz':
        contents = gzip.GzipFile(fileobj=StringIO(response.content)).read()
    else:
        contents = response.content
    return contents

contents = [emails_from_filename(filename) for filename in filenames]
contents.reverse()

contents = "\n\n\n\n".join(contents)

with open(listname + '.txt', 'w') as filehandle:
    filehandle.write(contents)

```



*This post was originally hosted [elsewhere](https://planspacedotorg.wordpress.com/2014/09/21/scraping-gnu-mailman-pipermail-email-list-archives/).*
