#!/usr/bin/env python

import codecs
from lxml import etree
from lxml import html
import urllib
import os

tree = etree.parse('blogspot.xml')

atom = {'a': 'http://www.w3.org/2005/Atom'}
entries = tree.xpath('//a:entry', namespaces=atom)

posts = []
for entry in entries:
    comment = False
    for el in entry.iter():
        if 'id' in el.tag and 'post' in el.text:
            posts.append(entry)
        if 'reply' in el.tag:
            comment = True
    if comment:
        posts.pop()

for post in posts:
    for el in post.iter():
        if 'content' in el.tag:
            content = el.text
        if 'published' in el.tag:
            date = el.text[:10]
        if 'title' in el.tag:
            title = el.text
        if 'link' in el.tag and el.attrib['rel'] == 'alternate':
            link = el.attrib['href']
    if title is None:
        # This makes sense because only one is missing
        title = 'Thinking about educational technology'
    path = (date.replace('-', '/') +
            '/' +
            link[38:-5] +
            '/')
    print '* ' + date + ': [' + title + '](/' + path + ')'
    if not os.path.exists(path):
        os.makedirs(path)
    tree = html.fromstring(content)
    for el in tree.iter():
        if 'style' in el.attrib:
            del(el.attrib['style'])
    imgs = [img for img in tree.findall('.//img')]
    badnamer = 1
    for img in imgs:
        if 'width' in img.attrib:
            del(img.attrib['width'])
        if 'height' in img.attrib:
            del(img.attrib['height'])
        displayed_src = img.attrib['src']
        displayed_filename = displayed_src.split('/')[-1]
        parent = img.getparent()
        if parent.tag == 'a':
            link_href = parent.attrib['href']
            link_filename = link_href.split('/')[-1]
            if link_filename == displayed_filename:
                if not os.path.exists(path + link_filename):
                    urllib.urlretrieve(link_href, path+link_filename)
                img.attrib['src'] = link_filename
                parent.attrib['href'] = link_filename
            else:
                if not os.path.exists(path + displayed_filename):
                    urllib.urlretrieve(displayed_src, path+displayed_filename)
                img.attrib['src'] = displayed_filename
        else:
            if displayed_src.endswith('=1'):
                displayed_filename = 'badname' + str(badnamer) + '.png'
                badnamer += 1
            if not os.path.exists(path + displayed_filename):
                urllib.urlretrieve(displayed_src, displayed_filename)
            img.attrib['src'] = displayed_filename
    content = html.tostring(tree, pretty_print=True)
    with codecs.open(path + 'index.md', 'w', encoding='utf-8') as f:
        f.write('# ' + title + '\n\n')
        f.write(content + '\n\n')
        f.write('*This post was originally hosted [elsewhere](' +
                link + ').*\n')
