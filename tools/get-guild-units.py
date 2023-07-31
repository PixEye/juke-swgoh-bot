#! env python

import requests
import sys

if len(sys.argv)!=2 or sys.argv[1]=="-h" or sys.argv[1]=="--help":
    cmd = sys.argv[0]
    sys.exit(f"Usage:\n\t{cmd} guild_id > guild.csv")

# list of user parameters :
guild_id = sys.argv[1]

# Step 1 - retrieve guild ally codes from the web service
url = "https://swgoh.gg/api/guild-profile/" + guild_id
response = requests.get(url)
#response.raise_for_status()
if response.status_code != 200:
    print(response.text)
    sys.exit("Swgoh.gg guild web service looks down for the moment")

guild = response.json()
guild = guild["data"] # simplify since there is nothing else

cols = ["ally_code", "type", "level", "star", "gear", "relic", "power", "player", "unitName"]
sep = ";"   # column separator
print(sep.join(cols))

# gName = guild["name"]
for member in guild["members"]:
    ally_code = str(member["ally_code"])
    url = "https://swgoh.gg/api/player/" + ally_code + "/"

    # Step 2 - retrieve the data from the web service
    response = requests.get(url)
    #response.raise_for_status()
    if response.status_code != 200:
        print(response.text)
        sys.exit("Swgoh.gg player web service looks down for the moment. Ally code was: "+ally_code)

    player = response.json()
    pName = player["data"]["name"]
    if pName != pName.encode("utf-8"):
        pName = str(pName.encode("utf-8"))

    for unit in player["units"]:
        u = unit["data"]    # shortcut

        gear = u["gear_level"]
        gear = str(gear) if gear>9 else "0"+str(gear)

        level = u["level"]
        level = str(level) if level>9 else "0"+str(level)

        relic = u["relic_tier"] - 2 if u["gear_level"]>12 else 0
        line = [
            ally_code, str(u["combat_type"]), level, str(u["rarity"]),
            gear, str(relic), str(u["power"]), pName, u["name"]
        ]
        print(sep.join(line))

# vim: wrap
