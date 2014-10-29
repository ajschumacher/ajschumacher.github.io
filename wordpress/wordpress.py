#!/usr/bin/env python

import codecs
from lxml import etree
from lxml import html
import urllib
import os
import re


def process_wordpress(content):
    lines = content.split('\n')
    new_lines = list()
    for line in lines:
        if '[code' in line:
            new_lines.append('```')
            continue
        if '[/code' in line:
            new_lines.append('```')
            continue
        line = line.replace('<p>', '\n')
        line = line.replace('</p>', '\n')
        new_lines.append(line)
    return '\n'.join(new_lines)

tree = etree.parse('wordpress.xml')

entries = tree.xpath('//item')

posts = []  # and pages
for entry in entries:
    for el in entry.iter():
        if 'post_type' in el.tag:
            if el.text in ['post', 'page']:
                posts.append(entry)
posts.reverse()

for post in posts:
    for el in post.iter():
        if 'comment' in el.tag:
            continue
        if 'title' in el.tag:
            title = el.text
        if 'content' in el.tag:
            content = el.text
        if 'link' in el.tag:
            # print el.tag
            # print el.text
            # print el.text[21:]
            path = el.text[21:]
            if '?' in path:
                path = 'drafts/' + path[-3:]
    # print ' * ' + path[:10].replace('/', '-') + ': [' + title + \
    #       '](/' + path + ')'
    content_raw = content
    content = process_wordpress(content)
    if not os.path.exists(path):
        os.makedirs(path)
    tree = html.fromstring(content)
    for el in tree.iter():
        if 'style' in el.attrib:
            del(el.attrib['style'])
    imgs = [img for img in tree.findall('.//img')]
    for img in imgs:
        if 'width' in img.attrib:
            del(img.attrib['width'])
        if 'height' in img.attrib:
            del(img.attrib['height'])
        displayed_src = img.attrib['src']
        if '?' in displayed_src:
            displayed_src = displayed_src[:displayed_src.index('?')]
        displayed_filename = displayed_src.split('/')[-1]
        parent = img.getparent()
        if parent.tag == 'a':
            link_href = parent.attrib['href']
            link_filename = link_href.split('/')[-1]
            if (link_filename != '' and
               displayed_filename.startswith(link_filename)):
                if not os.path.exists(path + link_filename):
                    urllib.urlretrieve(link_href, path+link_filename)
                img.attrib['src'] = link_filename
                parent.attrib['href'] = link_filename
            else:
                if not os.path.exists(path + displayed_filename):
                    urllib.urlretrieve(displayed_src, path+displayed_filename)
                img.attrib['src'] = displayed_filename
        else:
            if not os.path.exists(path + displayed_filename):
                urllib.urlretrieve(displayed_src, displayed_filename)
            img.attrib['src'] = displayed_filename
    content = html.tostring(tree, pretty_print=True)
    content = content.replace('<p>', '\n')
    content = content.replace('</p>', '\n')
    content = content.replace('<div>', '\n')
    content = content.replace('</div>', '\n')
    content = re.sub('\n+', '\n\n', content)
    with codecs.open(path + 'index.md', 'w', encoding='utf-8') as f:
        f.write('# ' + title + '\n\n')
        f.write(content + '\n\n')
        f.write('*This post was originally hosted elsewhere.*\n')
