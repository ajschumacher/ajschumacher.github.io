#!/usr/bin/env python

"""
Take a markdown file with a first-line "#" title and find the nearest
"header.html" and "footer.html" (in the directory tree going up).
Convert the markdown to HTML with title in a <header>, other content
in an <article>, prepend the header (with title inserted) and tack on
the footer.
"""

import os
import codecs
import markdown


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


def add_code_blocks(lines):
    in_block = False
    for i, line in enumerate(lines):
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
                lines[i-1] = lines[i-1].strip()
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
    header = '<header>' + markdown.markdown(title_line) + '</header>'
    title = title_to_text(title_line)
    lines = add_code_blocks(lines)
    body = '<article>' + markdown.markdown("".join(lines)) + '</article>'
    start = file_or_bust(calling_dir, 'header.html')
    start = start.replace('HEAD_TITLE', title)
    end = file_or_bust(calling_dir, 'footer.html')
    return start + header + body + end


def main():
    result = make_page('index.md')
    with codecs.open('index.html', 'w', encoding='utf-8') as f:
        f.write(result)

if __name__ == '__main__':
    main()
