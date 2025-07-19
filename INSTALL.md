![Logo of JsB](Assets/Maul-s-eye_128x128.jpg)

# Juke's SWGoH Bot (JSB)

## Quick description

Juke's SWGoH bot: a Star Wars Galaxy of Heroes helper bot running on [Discord](https://discordapp.com/). SWGoH is a mobile game (for Android and iOS).

This bot get players and guilds data through the [SWGoH Help API](https://api.swgoh.help/).

## Technical requirements for installation

[NodeJS](https://nodejs.org/en/) & a [MySQL](https://dev.mysql.com/) database system.
It works (tested) under Windows 10 (but it should also work under Linux) and with NodeJS v10.15.3 (at least).

JSB requires the following NodeJS modules:

* api-swgoh-help
* discord.js
* mysql

Use the "mk-tables.sql" file to create the tables in a MySQL database.

## Run it

### From a Linux box

Use the shell script located at: src/jsb.sh

    $ src/jsb.sh

### From Windows OS

We advice to install MINGW64 or Debian from the Windows store and run the same script as the Linux chapter (above).

## About the author

Juke M is also known as [PixEye](http://pixeye.net).
