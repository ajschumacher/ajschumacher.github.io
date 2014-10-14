#!/usr/bin/env python

"""
Take a markdown file with a first-line "#" title and find the nearest
"header.html" and "footer.html" (in the directory tree going up).
Convert the markdown to HTML with title in a <header>, other content
in an <article>, prepend the header (with title inserted) and tack on
the footer.
"""

import codecs
import markdown


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
    return lines


def title_to_text(line):
    title = line[1:].strip()
    if 'plan' in title and 'space' in title:
        title = 'plan space from outer nine'
    return title


def make_page(filename):
    with codecs.open(filename, encoding='utf-8') as f:
        lines = [line for line in f]
    title_line = lines.pop(0)
    header = '<header>' + markdown.markdown(title_line) + '</header>'
    title = title_to_text(title_line)
    lines = add_code_blocks(lines)
    body = '<article>' + markdown.markdown("".join(lines)) + '</article>'
    with codecs.open('header.html', encoding='utf-8') as f:
        start = f.read()
    start = start.replace('HEAD_TITLE', title)
    with codecs.open('footer.html', encoding='utf-8') as f:
        end = f.read()
    return start + header + body + end


def main():
    result = make_page('index.md')
    with codecs.open('index.html', 'w', encoding='utf-8') as f:
        f.write(result)

if __name__ == '__main__':
    main()
