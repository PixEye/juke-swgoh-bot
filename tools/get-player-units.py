#! env python

import requests
import sys

if len(sys.argv)!=2 or sys.argv[1]=='-h' or sys.argv[1]=='--help':
    cmd = sys.argv[0]
    sys.exit(f"Usage:\n\t{cmd} ally_code > guild.csv")

# list of user parameters :
allycode = sys.argv[1]

base_url = "https://swgoh.gg/api/player/"
cols = ["allycode", "type", "level", "star", "gear", "relic", "power", "player", "unitName"]
sep = ';'   # column separator
url = base_url + allycode + '/'

# Step 1 - retrieve the data from the web service
response = requests.get(url)
#response.raise_for_status()
if response.status_code != 200:
    print(response.text)
    sys.exit("Web service looks down for the moment")

player = response.json()
pName = player['data']['name']

print(sep.join(cols))
for unit in player['units']:
    u = unit['data']

    gear = u['gear_level']
    gear = str(gear) if gear>9 else '0'+str(gear)
    relic = u['relic_tier']-2 if u['gear_level']>12 else 0
    line = [
        allycode, str(u['combat_type']), str(u['level']), str(u['rarity']),
        gear, str(relic), str(u['power']), pName, u['name']
    ]
    print(sep.join(line))

# vim: wrap
