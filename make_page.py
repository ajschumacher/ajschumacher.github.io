#!/usr/bin/env python

"""
Take a markdown file with a first-line "#" title and find the nearest
"header.html" and "footer.html" (in the directory tree going up).
Convert the markdown to HTML with title in a <header>, other content
in an <article>, prepend the header (with title inserted) and tack on
the footer.
"""

import argparse
import os
import re
import codecs
import markdown
from datetime import datetime


def file_or_bust(dir, filename):
    path = os.path.join(dir, filename)
    if os.path.isfile(path):
        with codecs.open(path, encoding='utf-8') as f:
            result = f.read()
        return result
    elif os.path.ismount(dir):
        raise IOError('failed to find ' + filename)
    else:
        parent_dir = os.path.join(dir, os.pardir)
        return file_or_bust(parent_dir, filename)


def slides_from(lines):
    in_slide = False
    slides = []
    for line in lines:
        if line.strip() == "-----":
            if not in_slide:
                in_slide = True
                slide = []
            else:
                in_slide = False
                slide = ''.join(slide)
                slide = markdown.markdown(slide)
                slide = '<div>\n' + slide + '\n</div>\n'
                slides.append(slide)
        elif in_slide:
            slide.append(line)
    return ''.join(slides)


def add_code_blocks(lines):
    in_block = False
    for i, line in enumerate(lines):
        if in_block:
            line = line.replace('<', '&lt;')
            lines[i] = line
        if line.startswith("```"):
            if not in_block:
                lang = line.replace("`", "").strip()
                if lang:
                    lang_string = ' class="language-' + lang + '"'
                else:
                    lang_string = ''
                lines[i] = '<pre><code' + lang_string + '>'
                in_block = True
            else:
                lines[i-1] = lines[i-1].rstrip()
                lines[i] = '</code></pre>\n'
                in_block = False
    return lines


def title_to_text(line):
    title = line[1:].strip()
    if 'plan' in title and 'space' in title:
        title = 'plan space from outer nine'
    return title


def make_page(filename):
    calling_dir = os.getcwd()
    with codecs.open(filename, encoding='utf-8') as f:
        lines = [line for line in f]
    title_line = lines.pop(0)
    header = markdown.markdown(title_line)
    title = title_to_text(title_line)
    lines = add_code_blocks(lines)
    slides = slides_from(lines)
    if slides:
        slides = '<div>\n' + title + '\n</div>\n' + slides
        slides_start = file_or_bust(calling_dir, 'slides_header.html')
        slides_end = file_or_bust(calling_dir, 'slides_footer.html')
        slides_html = slides_start + slides + slides_end
    else:
        slides_html = None
    regex = re.compile(r'([0-9]{4})(?:.?)([0-9]{2})(?:.?)([0-9]{2})')
    match = regex.search(calling_dir)
    if match:
        date_string = ''.join(match.groups())
        date = datetime.strptime(date_string, '%Y%m%d')
        date_string = datetime.strftime(date, '%A %B %e, %Y')
        header += '\n<p class="date">' + date_string + '</p>\n'
    body = markdown.markdown("".join(lines))
    start = file_or_bust(calling_dir, 'header.html')
    start = start.replace('HEAD_TITLE', title)
    end = file_or_bust(calling_dir, 'footer.html')
    plain_html = start + header + body + end
    return plain_html, slides_html


def build_in_cwd():
    plain_html, slides_html = make_page('index.md')
    with codecs.open('index.html', 'w', encoding='utf-8') as f:
        f.write(plain_html)
    if slides_html:
        with codecs.open('big.html', 'w', encoding='utf-8') as f:
            f.write(slides_html)


def recurse():
    things = os.listdir('.')
    directories = filter(lambda x: os.path.isdir(x), things)
    for directory in directories:
        print directory
        os.chdir(directory)
        recurse()
        if os.path.exists('index.md'):
            build_in_cwd()
        os.chdir(os.pardir)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='make page(s)')
    parser.add_argument('-r', '--recurse', action='store_true',
                        help='make pages recursively')
    args = parser.parse_args()
    if os.path.exists('index.md'):
        build_in_cwd()
    if args.recurse:
        recurse()
