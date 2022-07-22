![Logo of JsB](Assets/Maul-s-eye_128x128.jpg)

# jsb

## Quick description

Juke's SWGoH [Discord](https://discordapp.com/) bot: a Star Wars Galaxy of Heros helper bot running on Discord. SWGoH is a mobile game (for iOS and Android).

This bot get players and guilds data through the [SWGoH Help API](https://api.swgoh.help/).

## Technical requirements for installation

[NodeJS](https://nodejs.org/en/) & a [MySQL](https://dev.mysql.com/) SGDB.
It works (tested) under Windows 10 (but it should also work under Linux) and with NodeJS v10.15.3 (at least).

JSB requires the following NodeJS modules:

* api-swgoh-help
* discord.js
* mysql

Use the "mk-tables.sql" file to create the tables in a MySQL database.

## Run it

I use to run the bot by simply typing the following command line in a console from the "src" folder:

    $ while true;do git pull && node .;done

## About the author

Juke M is also known as [PixEye](http://pixeye.net). He is a graduated developer since 1997.
