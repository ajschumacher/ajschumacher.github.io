import os
import csv
import requests


words_path = '200words.csv'
urls_path = '200words100urls.csv'
out_path = 'imagehook'


with open(words_path) as f:
    reader = csv.reader(f)
    nwid_name = {nwid: name.replace(' ', '_') for nwid, name in reader}

nwid_count = {}

with open(urls_path) as urls_file:
    reader = csv.reader(urls_file)
    for image_id, url in reader:
        nwid, _ = image_id.split('_')
        if 5 <= nwid_count.get(nwid, 0):  # have enough
            continue
        filename = out_path + '/' + image_id + '_' + nwid_name[nwid] + '.jpg'
        if os.path.exists(filename):  # already got this one
            nwid_count[nwid] = nwid_count.get(nwid, 0) + 1
            continue
        try:
            response = requests.get(url)
        except:
            continue  # request failed
        if response.status_code != 200:  # status ok
            continue
        if response.content[:2] != '\xFF\xD8':  # JPG
            continue
        with open(filename, 'wb') as out_file:
            out_file.write(response.content)
        print filename
        nwid_count[nwid] = nwid_count.get(nwid, 0) + 1
