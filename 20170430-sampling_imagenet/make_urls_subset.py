import csv
import random


words_path = '200words.csv'
urls_path = 'fall11_urls.txt'
n = 100
out_path = '200words100urls.csv'

with open(words_path) as f:
    reader = csv.reader(f)
    wnid_rows = {wnid: [] for wnid, word in reader}

with open(urls_path) as f:
    reader = csv.reader(f, delimiter='\t')
    for row in reader:
        if len(row) != 2:
            print 'strange row: {}'.format(row)
        image_id, url = row[0], row[1]
        wnid, _ = image_id.split('_')
        if wnid in wnid_rows:
            print image_id
            wnid_rows[wnid].append([image_id, url])

with open(out_path, 'w') as f:
    writer = csv.writer(f)
    for wnid, rows in wnid_rows.items():
        print '{} rows for {}'.format(len(rows), wnid)
        sampled_rows = random.sample(rows, 100)
        for row in sampled_rows:
            writer.writerow(row)
