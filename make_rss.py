#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Hack together an RSS feed (rss.xml) by looking at index.html and
pulling in the twenty most recent articles.
"""

from __future__ import unicode_literals
import codecs
from lxml import html
from datetime import datetime

rss = """<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>plan ➔ space</title>
    <link>http://planspace.org/</link>
    <description>plan space from outer nine</description>
    <language>en-us</language>
    <atom:link href="http://planspace.org/rss.xml" rel="self" type="application/rss+xml" />
"""

with codecs.open('index.html', encoding='utf-8') as f:
    index = f.read()

tree = html.fromstring(index)
post_paths = tree.xpath('//ul[2]/li/a/@href')[:20]


for post_path in post_paths:
    rss += "<item>\n"
    with codecs.open('.' + post_path + 'index.html', encoding='utf-8') as f:
        post = f.read()
    tree = html.fromstring(post)
    article = tree.xpath('//article')[0]
    h1 = article.xpath('//h1')[0]
    title = h1.text_content()
    article.remove(h1)
    p = article.xpath('//p')[0]
    date_string = p.text_content()
    date = datetime.strptime(date_string, "%A %B %d, %Y")
    date_string = datetime.strftime(date, "%a, %d %b %Y 12:00:00 -0500")
    article.remove(p)
    scripts = article.xpath('//script')
    for script in scripts:
        try:
            article.remove(script)
        except:
            pass
    description = html.tostring(article)
    description = description.replace("<article>", "")
    description = description.replace("</article>", "")
    rss += "<title>" + title + "</title>\n"
    rss += "<description><![CDATA[\n" + description + "]]></description>\n"
    rss += "<link>http://planspace.org" + post_path + "</link>\n"
    rss += "<guid>http://planspace.org" + post_path + "</guid>\n"
    rss += "<pubDate>" + date_string + "</pubDate>\n"
    rss += "</item>\n"


rss += """  </channel>
</rss>
"""

with codecs.open('rss.xml', 'w', encoding='utf-8') as f:
    f.write(rss)
