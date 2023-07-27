#! env python

import requests
import sys

# Usage example:    python get-player-units 123456789 > player.csv

# list of user parameters :
allycode = sys.argv[1]

base_url = "https://swgoh.gg/api/player/"
url = base_url + allycode + '/'

# Step 1 - retrieve the data from the web service
response = requests.get(url)
#response.raise_for_status()
if response.status_code != 200:
    print(response.text)
    sys.exit("Web service looks down")

user = response.json()
#print(f"User's name: {user['data']['name']}")

print(f"allycode;type;level;star;gear;relic;unitName")
for unit in user['units']:
    u = unit['data']
    if u['gear_level'] > 12:
        u['relic'] = u['relic_tier'] - 2
    else:
        u['relic'] = 0

    print(f"{allycode};{u['combat_type']};{u['level']};{u['rarity']};{u['gear_level']};{u['relic']};{u['name']}")

# vim: wrap
