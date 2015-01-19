from gogpy import gog
import numpy as np
import pandas as pd
gog(pd.DataFrame(np.random.sample(10)))


import time
data = pd.DataFrame(np.random.sample(100))
for i in range(91):
    gog(data[i:i+10])
    time.sleep(2)


import requests
from key import key
url = "https://api.meetup.com/2/rsvps?&sign=true&photo-host=public&rsvp=yes&event_id=219314544&page=100&key="+key
rsvps = requests.get(url).json()['results']
# import json
# with open('rsvps.json') as f: rsvps = json.loads(f.read())
rsvped = map(lambda _: _['created'], rsvps)
ids = map(lambda _: _['member']['member_id'], rsvps)
names = map(lambda _: _['member']['name'], rsvps)
data = pd.DataFrame({'x': rsvped, 'y': ids, 'name': names})
gog(data)
