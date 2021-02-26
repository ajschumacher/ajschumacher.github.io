# Elementary Presidents of the US Nations (merge stuff)


### Source data

`elements.csv` is a table copied on 2021-02-19 from
https://en.wikipedia.org/wiki/List_of_chemical_elements into Excel,
extra rows and columns deleted, and then saved as CSV.

`us_states.csv` is similarly taken on 2021-02-19 from
https://en.wikipedia.org/wiki/List_of_U.S._state_and_territory_abbreviations

`countries.csv` is similarly taken on 2021-02-24 from the natural link
on https://www.iso.org/iso-3166-country-codes.html

`presidents.csv` is downloaded on 2021-02-24 from
https://gist.github.com/namuol/2657233 then updated at the bottom


---

### Columns

 * symbol (US states, countries, elements (note))
 * US state
 * country
 * element
 * number (US president order, atomic number of elements)
 * president

(note) Elements with symbols that match an (all caps) two-letter code
should have their symbol in parentheses after their name...


---

### Code

```python
import csv

us_states = [line for line in csv.DictReader(open('us_states.csv'))]
data = {line['code']: {'us_state': line['\ufeffname']}
        for line in us_states}

countries = [line for line in csv.DictReader(open('countries.csv'))]
for line in countries:
    data.setdefault(line['Alpha-2 code'], {}).update(
        {'country': line['\ufeffEnglish short name']})

elements = [line for line in csv.DictReader(open('elements.csv'))]
for line in elements:
    if line['Symbol'].upper() in data:
        data[line['Symbol'].upper()].update(
            {'element': line['Element'] + f" ({line['Symbol']})",
             'number': line['\ufeffAtomic number']})
    else:
        data[line['Symbol']] = {'element': line['Element'],
                                'number': line['\ufeffAtomic number']}

presidents = [line for line in csv.DictReader(open('presidents.csv'))]
for line in presidents:
    # (Always a match because there haven't been that many presidents.)
    match = [value for value in data.values()
             if value.get('number') == line['Presidency ']][0]
    match['president'] = line['President ']

results = []
for symbol, line in data.items():
    row = [symbol,
           line.get('us_state'),
           line.get('country'),
           line.get('element'),
           int(line['number']) if 'number' in line else None,
           line.get('president')]
    results.append(row)

header = ['symbol', 'state', 'country', 'element', 'number', 'president']

# Okay, how to order this...
# Presidents and elements have a natural order...

def key(row):
    count = sum([e is not None for e in row])
    return -count, row[4] or 999, (row[0] or 'ZZ').upper()

results.sort(key=key)

with open('elepresusnations.csv', 'w') as f:
    writer = csv.writer(f)
    writer.writerows([header] + results)
```

Shared a version [on Google Sheets][].

[on Google Sheets]: https://docs.google.com/spreadsheets/d/1iv8Wdui64jiDkrM3fo5UFzhYFaXdvrl-O1vbJ8nEgYk/edit?usp=sharing
