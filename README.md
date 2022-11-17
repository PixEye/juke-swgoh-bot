![Logo of JsB](Assets/Maul-s-eye_128x128.jpg)

# Juke's SWGoH Bot (JSB)

## Quick description

Juke's SWGoH bot: a Star Wars Galaxy of Heros helper bot running on [Discord](https://discordapp.com/). SWGoH is a mobile game (for Android and iOS).

This bot get players and guilds data through the [SWGoH Help API](https://api.swgoh.help/).

## How to use this bot?

### Principles

Default target player is the person who types the command but you can specify an allycode (9 digits in either 123456789 or 123-456-789 formats) or instead tag someone else.

Commands are not case sensitive. You can type them in lowercase, uppercase or a mix.

There WAS a ("j.") prefix to use before Discord changes on 2022 summer but it is over now. You still _can_ use it, but it is not required anymore. Instead, you can:

* send direct commands to the bot in DM (direct messages) like this:
```
    GL Rey
```
* or you will have to tag the bot before to write the command you want like this:
```
    @JsB check profundity
```
### Main commands

Here is a quick list of main commands to know about this bot (do not write the quotes):

* "help" to get a pretty full list of commands available. French version is available with "aide" command
* "reg" or "register" with an allycode as required parameter to tells the bot to link an allycode to a Discord account
* "ac" or "allycode" to get someone's allycode. It is fast because it does not use the game API
* "invite" to a get a link in order to invite this bot to your own Discord server
* "ps" or "playerStats" to get a player's statistics
* "gs" or "guildStats" to get a player's guild statistics
* "gl" or "check" to check one or all unit(s) for game requirements

## Installation

[Installation process](INSTALL.md) is described on a [dedicated (install) page](INSTALL.md).
