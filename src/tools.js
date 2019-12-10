/**
 * tools.js is the functions module for Juke's SWGoH Discord bot
 * @author PixEye@pixeye.net
 * @since  2019-12-09
 */

// jshint esversion: 8

// Extract the required classes from the discord.js module:
const { Client, RichEmbed } = require("discord.js");

// Create an instance of a Discord client:
//const client = new Client();

// Get the configuration from a separated JSON file:
const config = require("./config.json");

// Remember when this program started:
//const start = Date();

// Database connection:
const mysql = require("mysql");

// Load my other module(s):
const swgoh = require("./swgoh"); // SWGoH API
//const tools = require("./tools"); // My functions

// Prepare DB connection pool:
const db_pool = mysql.createPool({
	connectionLimit: config.db.conMaxCount,
	database       : config.db.name,
	host           : config.db.host,
	password       : config.db.pw,
	user           : config.db.user
});

// Shortcut(s):
//var logPrefix = exports.logPrefix;

exports.checkPlayerMods = function(player, message) {
    let logPrefix = exports.logPrefix; // shortcut
    let maxLines = 5;

	if (!player.gp) {
		console.log(logPrefix()+"invalid GP for user:", player);
		return;
	}

	exports.updatePlayerDataInDb(player, message);

	let color = "GREEN";
	let lines = [];
	let maxModsCount = 6;
	let minCharLevel = 50;
	let n = 0;
	let unitsWithoutAllModules = player.unitsData.filter(function(unit) {
			// Main filter:
			return unit.combatType===1 && unit.level>=minCharLevel && unit.mods.length<maxModsCount;
		}).sort(function(a, b) {
			return b.gp-a.gp; // sort by galactic power (descending GP)
		});
	let tpmmc = 0; // total player's missing modules count

	n = unitsWithoutAllModules.length;
	console.log(logPrefix()+"%d unit(s) with missing modules found.", n);
	// console.dir(player.unitsData);

	if (n === 0) {
		let msg = "";

		console.log(logPrefix()+"There is 0 known units with missing modules in this roster.");
		lines = ["All player's level 50+ characters have "+maxModsCount+" modules."];
	} else {
		color = "ORANGE";
		unitsWithoutAllModules.forEach(function(unit, i) {
			tpmmc += maxModsCount - unit.mods.length;
			if (i<maxLines)
				lines.push((maxModsCount-unit.mods.length)+" missing module(s) on: (GP="+unit.gp+") "+unit.name);
			else if (i===maxLines)
				lines.push("And "+(n-maxLines)+" more...");
		});
		console.log(logPrefix()+"%d total character(s) with %d total missing modules found.", tpmmc, maxModsCount);
	}

	richMsg = new RichEmbed()
		.setTitle(player.name+" has "+n+" unit(s) with "+tpmmc+" missing module(s)")
		.setDescription(lines).setColor(color)
		.setTimestamp(player.updated)
		.setFooter(config.footer.message, config.footer.iconUrl);
	message.channel.send(richMsg);

	player.unitsData.forEach(function(u) { // u = current unit
		lines.push(
			[u.allycode, u.name, u.combatType, u.gear, u.gp, u.relic, u.zetaCount]
		);
	});
};

exports.checkUnitsGp = function(player, message, limit) {
    let logPrefix = exports.logPrefix; // shortcut

	if (!player.gp) {
		console.log(logPrefix()+"invalid GP for user:", player);
		return;
	}

	exports.updatePlayerDataInDb(player, message);

	let color = "GREEN";
	let minit = limit-1;
	let lines = [];
	let maxGp = limit*1000;
    let maxLines = 10;
	let minGp = minit*1000;
	let minCharLevel = 50;
	let n = 0;
	let units = player.unitsData.filter(function(unit) {
			// Main filter:
			return unit.combatType===1 && unit.gp>minGp && unit.gp<maxGp;
		}).sort(function(a, b) {
			return b.gp-a.gp; // sort by galactic power (descending GP)
		});

	n = units.length;
	console.log(logPrefix()+"%d unit(s) on the border-line.", n);
	// console.dir(player.unitsData);

	if (n === 0) {
		let msg = "";

		console.log(logPrefix()+"There is 0 known units on the border line in this roster.");
		lines = ["There is no player's characters between "+minGp+" and "+maxGp+" of GP."];
	} else {
		color = "ORANGE";
		units.forEach(function(u, i) {
			if (i<maxLines)
				lines.push("(GP="+u.gp+"; G"+u.gear+"; "+u.zetaCount+"z) "+u.name);
			else if (i===maxLines)
				lines.push("And "+(n-maxLines)+" more...");
		});
		console.log(logPrefix()+"%d total character(s) with GP between %dk & %dk.", n, minit, limit);
	}

	richMsg = new RichEmbed()
		.setTitle(player.name+" has "+n+" unit(s) with GP between "+minit+"k and "+limit+"k")
		.setDescription(lines).setColor(color)
		.setTimestamp(player.updated)
		.setFooter(config.footer.message, config.footer.iconUrl);
	message.channel.send(richMsg);

	player.unitsData.forEach(function(u) { // u = current unit
		lines.push(
			[u.allycode, u.name, u.combatType, u.gear, u.gp, u.relic, u.zetaCount]
		);
	});
};

/** Try to find an ally code in the words of the user's message */
exports.getFirstAllycodeInWords = function(words) {
	var allycode = 0;
    let logPrefix = exports.logPrefix; // shortcut

	if (words.join("").trim().length>0) {
		words.forEach(function(word) {
			// ignore too short words, tags/mentions & not numeric words:
			if (word.length>8 && word.indexOf("<")<0 && !word.match(/[a-z]/i) && word.match(/[0-9]{3,}/)) {
				allycode = parseInt(word.replace(/[^0-9]/g, ""));
				console.log(logPrefix()+"Found allycode:", allycode);
			}
		});
	}

	return allycode;
};

exports.getGuildStats = function(allycode, message) {
    let locale = config.discord.locale; // shortcut
    let logPrefix = exports.logPrefix; // shortcut

	if (!allycode) {
		message.reply(":red_circle: Invalid or missing allycode!");
		return;
	}

	message.channel.send("Looking for stats of guild with ally: "+allycode+"...")
		.then(msg => {
			swgoh.getPlayerGuild(allycode, message, function(guild) {
                let msg = "";

				if (typeof(msg.delete)==="function") msg.delete();

				if (!guild.gp) {
                    msg = "Invalid guild GP: "+guild.gp;
					console.log(logPrefix()+msg);
                    message.reply(msg);
					return;
				}

                richMsg = new RichEmbed().setTitle(guild.name).setColor("GREEN")
                    .setAuthor(config.discord.username)
                    .setDescription([
                        "**Guild description:** "+guild.desc,
                        "", "**Officers ("+guild.officerNames.length+"):** "+guild.officerNames.sort().join(", ")
                    ])
                    .addField("GP:",
                        guild.gp.toLocaleString(locale), true)
                    .addField("Member count:",
                        guild.members, true)
                    .addField("GP average:",
                        Math.round(guild.gp/guild.members).toLocaleString(locale), true)
                    .addField("Leader:",
                        guild.leader.name +" (GP: "+ guild.leader.gp.toLocaleString(locale)+")", true)
                    .addField("Biggest GP:",
                        guild.biggestPlayer.name+" (GP: "+guild.biggestPlayer.gp.toLocaleString(locale)+")", true)
                    .setTimestamp(guild.updated)
                    .setFooter(config.footer.message, config.footer.iconUrl);
                message.reply(richMsg);

				// Remember stats of the guild:
                exports.rememberGuildStats(guild);
			});
		})
		.catch(console.error);
};

exports.getLastEvols = function(player, message) {
	let allycode = player.allycode;
    let logPrefix = exports.logPrefix; // shortcut
	let sql = "SELECT * FROM `evols`"+
		" WHERE allycode="+parseInt(allycode)+
		" ORDER BY `id` DESC LIMIT 11";

	exports.updatePlayerDataInDb(player, message);

	db_pool.query(sql, function(exc, result) {
		if (exc) {
			let otd = exc.sqlMessage? exc.sqlMessage: exc;
			// otd = object to display

			console.log("SQL:", sql);
			console.log(logPrefix()+"GLA Exception:", otd);
			return;
		}

		console.log(logPrefix()+"%d evols match allycode:", result.length, allycode);

		exports.showLastEvols(player, message, result);
	});
};

exports.getPlayerFromDatabase = function(allycode, message, callback) {
    let logPrefix = exports.logPrefix; // shortcut
	let player = null;
	let sql = "SELECT * FROM `users` WHERE allycode="+parseInt(allycode);

	db_pool.query(sql, function(exc, result) {
		if (exc) {
			console.log("SQL:", sql);
			console.log(logPrefix()+"GPFAC1 Exception:", exc.sqlMessage? exc.sqlMessage: exc);

			if (typeof(callback)==="function") callback(null);
			return;
		}

		console.log(logPrefix()+result.length+" record(s) match(es) allycode:", allycode);
		// console.dir(result);
		if (result.length === 1) {
			player = result[0];
			console.log(logPrefix()+"Found user:", player.discord_name);

			// Get player's units:
			sql = "SELECT * FROM `units` WHERE allycode="+parseInt(allycode);
			sql+= " AND `combatType`=1"; // keep only characters (exclude ships)

			db_pool.query(sql, function(exc, result) {
				if (exc) {
					console.log("SQL:", sql);
					console.log(logPrefix()+"GPFAC2 Exception:", exc.sqlMessage? exc.sqlMessage: exc);

					if (typeof(callback)==="function") callback(player);
					return;
				}

				// Add units to the player object:
				console.log(logPrefix()+"GPFAC get %d characters for:", result.length, player.discord_name);
				player.unitsData = {length: 0};
				result.forEach(function(u) {
					player.unitsData.length++;
					player.unitsData[u.name] = u;
				});

				if (typeof(callback)==="function") callback(player);
			});
			return;
		}

		console.log(logPrefix()+"User with allycode "+allycode+" not found!");
		message.reply("I don't know this player. Register her/him first please.");

		if (typeof(callback)==="function") callback(player);
	});
};

exports.getPlayerFromDiscordId = function(discord_id, message, callback) {
    let logPrefix = exports.logPrefix; // shortcut
	let sql = "SELECT * FROM `users` WHERE discord_id="+parseInt(discord_id);

	db_pool.query(sql, function(exc, result) {
		if (exc) {
			console.log("SQL:", sql);
			console.log(logPrefix()+"GPFDI Exception:", exc.sqlMessage? exc.sqlMessage: exc);

			if (typeof(callback)==="function") callback(null);
			return;
		}

		console.log(logPrefix()+result.length+" record(s) match(es) user's ID:", discord_id);
		// console.dir(result);
		if (result.length === 1) {
			console.log(logPrefix()+"Found allycode:", result[0].allycode);

			if (typeof(callback)==="function") callback(result[0]);
			return;
		}

		console.log(logPrefix()+"Allycode not found"); // Normal for "self(y)" command
		message.reply("This user has no player ID. You may try: "+config.discord.prefix+"register ally-code");

		if (typeof(callback)==="function") callback(null);
	});
};

exports.getPlayerStats = function(allycode, message, callback) {
	if (!allycode) {
		message.reply(":red_circle: Invalid or missing allycode! Try 'register' command.");
		return;
	}

	message.channel.send("Looking for "+allycode+"'s stats...")
		.then(msg => {
			swgoh.getPlayerData(allycode, message, function(arg1, arg2, arg3) {
				if (typeof(msg.delete)==="function") msg.delete();

				if (typeof(callback)==="function") callback(arg1, arg2, arg3);
			});
		})
		.catch(function(exc) {
			if (msg && typeof(msg.delete)==="function") msg.delete();

			console.error(exc);
		});
};

exports.getUnregPlayers = function(allycode, message) {
    let logPrefix = exports.logPrefix; // shortcut

	if (!allycode) {
		message.reply(":red_circle: Invalid or missing allycode!");
		return;
	}

	message.channel.send("Looking for unregistered players of guild with ally: "+allycode+"...")
		.then(msg => {
			swgoh.getPlayerGuild(allycode, message, function(guild) {
				if (typeof(msg.delete)==="function") msg.delete();

				if (!guild.gp) {
					console.warn(logPrefix()+"GUP: invalid guild GP:", guild.gp);
					return;
				}

				let sql = "SELECT * FROM `users` WHERE allycode IN (?)";
                let values = Object.keys(guild.players);
                let n = values.length;

                console.log(logPrefix()+"GUP: received %d user(s).", n);

				db_pool.query(sql, [values], function(exc, regPlayers) {
                    let msg = "%d registered users out of %d.";
                    let unregPlayers = [];

					if (exc) {
						let otd = exc.sqlMessage? exc.sqlMessage: exc;
						// otd = object to display

						console.log(logPrefix()+"SQL:", sql);
						console.log(logPrefix()+"GUP Exception:", otd);
                        message.reply("Failed!");
						return;
					}

					console.log(logPrefix()+msg, regPlayers.length, n);

                    n-= regPlayers.length;
                    msg = n+" not registered player(s) found in this guild";
					console.log(logPrefix()+msg);

                    if (!n) {
                        msg = "All "+values.length+
                            " players in this guild are registered. :white_check_mark:";
                    } else {
                        regPlayers.forEach(function(regPlayer) {
                            delete guild.players[regPlayer.allycode];
                        });
                        Object.keys(guild.players).forEach(function(allycode, i) {
                            unregPlayers.push(guild.players[allycode]+" ("+allycode+")");
                        });
                        msg = "**"+msg+":** "+unregPlayers.sort().join(", ")+".";
                    }
                    message.channel.send(msg);
				});
			});
		})
		.catch(console.error);
};

exports.guildPlayerStats = function(allycode, message) {
    let locale = config.discord.locale; // shortcut
    let logPrefix = exports.logPrefix; // shortcut

	if (!allycode) {
		message.reply(":red_circle: Invalid or missing allycode!");
		return;
	}

	message.channel.send("Looking for stats of guild with ally: "+allycode+"...")
		.then(msg => {
			swgoh.getPlayerGuild(allycode, message, function(guild) {
                let msg = "";

				if (typeof(msg.delete)==="function") msg.delete();

				if (!guild.gp) {
                    msg = "Invalid guild GP: "+guild.gp;
					console.log(logPrefix()+msg);
                    message.reply(msg);
					return;
				}

                richMsg = new RichEmbed().setTitle(guild.name).setColor("GREEN")
                    .setAuthor(config.discord.username)
                    .setDescription([
                        "**Guild description:** "+guild.desc,
                        "", "**Officers ("+guild.officerNames.length+"):** "+guild.officerNames.sort().join(", ")
                    ])
                    .addField("GP:",
                        guild.gp.toLocaleString(locale), true)
                    .addField("Member count:",
                        guild.members, true)
                    .addField("GP average:",
                        Math.round(guild.gp/guild.members).toLocaleString(locale), true)
                    .addField("Leader:",
                        guild.leader.name +" (GP: "+ guild.leader.gp.toLocaleString(locale)+")", true)
                    .addField("Biggest GP:",
                        guild.biggestPlayer.name+" (GP: "+guild.biggestPlayer.gp.toLocaleString(locale)+")", true)
                    .setTimestamp(guild.updated)
                    .setFooter(config.footer.message, config.footer.iconUrl);
                message.reply(richMsg);

				// Remember stats of the guild:
                exports.rememberGuildStats(guild);
			});
		})
		.catch(console.error);
};

exports.logPrefix = function () {
	let dt = new Date();

	return dt.toString().replace(/ GMT.*$$/, "")+" - ";
};

/** Remember stats of the guild */
exports.rememberGuildStats = function(guild) {
    let sql = "REPLACE INTO `guilds` (swgoh_id, name) VALUES ?";
    let values = [[guild.id, guild.name]];

    db_pool.query(sql, [values], function(exc, result) {
        if (exc) {
            let otd = exc.sqlMessage? exc.sqlMessage: exc;
            // otd = object to display

            console.log("SQL:", sql);
            console.log(logPrefix()+"GS Exception:", otd);
            return;
        }

        console.log(exports.logPrefix()+"%d guild updated.", result.affectedRows);
    });
};

exports.showCharInfo = function(player, message, charName) {
    let logPrefix = exports.logPrefix; // shortcut

	if (!player.gp) {
		console.log(logPrefix()+"invalid GP for user:", player);
		return;
	}

	exports.updatePlayerDataInDb(player, message);

	let color = "RED";
	let foundUnit = null;
	let hiddenFields = ["allycode", "combatType", "name"];
	let lines = [];
	var pattern = null;
	let strToLookFor = charName.replace(/ /g, "").toUpperCase();

	console.log(logPrefix()+"Name to look for:", strToLookFor);
	pattern = new RegExp("^"+strToLookFor);

	player.unitsData.forEach(function(unit) {
		if (!foundUnit && unit.combatType===1 && unit.name.match(pattern)) {
			color = "GREEN";
			foundUnit = unit;
		}
	});

	if (!foundUnit) {
		player.unitsData.forEach(function(unit) {
			if (!foundUnit && unit.combatType===1 && unit.name.indexOf(strToLookFor)>=0) {
				color = "GREEN";
				foundUnit = unit;
			}
		});
	}

	let richMsg = new RichEmbed().setTimestamp(player.updated).setColor(color)
		.setFooter(config.footer.message, config.footer.iconUrl);

	if (!foundUnit) {
		lines = ["Did not find a character named '"+charName+"' in this roster!"];
		richMsg.setDescription(lines).setTitle(player.name+"'s "+charName);
		message.reply(richMsg);
		return;
	}

	richMsg.setThumbnail("https://swgoh.gg/game-asset/u/"+foundUnit.name+"/")
		.setTitle(player.name+"'s "+charName+" ("+foundUnit.name+")");

	Object.keys(foundUnit).forEach(function(key) {
		var val = foundUnit[key];

		if (hiddenFields.indexOf(key)<0) {
			switch(key) {
				case "gp":
					val = val.toLocaleString();
					break;

				case "gear":
				case "relic":
				case "zetaCount":
					val = val? "**"+val+"**": val;
					break;

				case "mods":
					val = val.length;
					break;

				case "stars":
					key+= " ("+val+")";
					val = ":star:".repeat(val);
					break;
			}
			richMsg.addField(exports.ucfirst(key)+":", val, true);
		}
	});
	message.channel.send(richMsg);
};

exports.showLastEvols = function(player, message, evols) {
	let allycode = player.allycode;
	let color = "GREEN";
	let lines = [];
	let maxDays = 10;
	let maxDt = 0;
    let maxLines = 10;
	let maxPeriod = 24 * 3600 * 1000 * maxDays;
	let msg = "";
	let n = 0;
	let now = new Date();
	let lastEvols = evols.filter(function(evol) {
			return (now.getTime() - evol.ts)<maxPeriod;
		});
    let logPrefix = exports.logPrefix; // shortcut

	n = lastEvols.length;
	console.log(logPrefix()+"%d evol(s) found.", n);
	// console.dir(player.unitsData);

	if (n === 0) {
		let msg = "";

		color = "ORANGE";
		msg = "No evolution in this roster for the last "+maxDays+" days";
		console.log(logPrefix()+msg);
		lines = [msg];
	} else {
		lastEvols.forEach(function(e, i) {
			let dt = e.ts.toString().replace(/ \(.*\)$/, "");
			let msg = dt+": "+e.unit_id;

			maxDt = (e.ts>maxDt)? e.ts: maxDt;

			switch(e.type) {
				case "gear":
					msg+= " turned G"+e.new_value;
					break;
				case "new":
					msg+= " unlocked.";
					break;
				case "star":
					msg+= " turned "+e.new_value+"*";
					break;
				case "zeta":
					msg+= " get "+e.type+" #"+e.new_value;
					break;
				default:
					msg+= " turned "+e.type+" to: "+e.new_value;
					console.warn("Unexpected evolution type '%s' at ID %d", e.type, e.id);
			}

			if (i<maxLines)
				lines.push(msg);
			else if (i===maxLines)
				lines.push("And some more...");
		});
	}

	if (!maxDt) maxDt = message.createdTimestamp;
	else maxDt = new Date(maxDt);

	richMsg = new RichEmbed()
		.setTitle(player.name+"'s "+n+" evolution(s) in the last "+maxDays+" days")
		.setDescription(lines).setColor(color).setTimestamp(maxDt)
		.setFooter(config.footer.message, config.footer.iconUrl);
	message.channel.send(richMsg);
};

exports.showPlayerRelics = function(player, message) {
    let logPrefix = exports.logPrefix; // shortcut
    let maxLines = 10;

	if (!player.gp) {
		console.log(logPrefix()+"invalid GP for user:", player);
		return;
	}

	exports.updatePlayerDataInDb(player, message);

	let color = "GREEN";
	let lines = [];
	let n = 0;
	let unitsWithRelics = player.unitsData.filter(function(unit) {
			return unit.relic>0; // main filter
		}).sort(function(a, b) {
			return b.relic-a.relic; // sort by relic count (descending)
		});
	let tprc = 0; // total player's relic count

	n = unitsWithRelics.length;
	console.log(logPrefix()+"%d unit(s) with relic found.", n);
	// console.dir(player.unitsData);

	if (n === 0) {
		let msg = "";

		color = "ORANGE";
		console.log(logPrefix()+"There is 0 known relics in this roster.");
		lines = ["I don't know any relic in this roster for the moment."];
	} else {
		unitsWithRelics.forEach(function(unit, i) {
			tprc += unit.relic;
			if (i<maxLines)
				lines.push(unit.relic+" relic(s) on: "+unit.name);
			else if (i===maxLines)
				lines.push("And "+(n-maxLines)+" more...");
		});
		console.log(logPrefix()+"%d total relic(s) found.", tprc);
	}

	richMsg = new RichEmbed()
		.setTitle(player.name+" has "+n+" unit(s) with "+tprc+" relic(s)")
		.setDescription(lines).setColor(color)
		.setTimestamp(player.updated)
		.setFooter(config.footer.message, config.footer.iconUrl);
	message.channel.send(richMsg);
};

exports.showPlayerStats = function(player, message) {
    let logPrefix = exports.logPrefix; // shortcut

	if (!player.gp) {
		console.log(logPrefix()+"invalid GP for user:", player);
		return;
	}

	exports.updatePlayerDataInDb(player, message);

	let richMsg = new RichEmbed().setTitle(player.name+"'s profile").setColor("GREEN")
		.setDescription([
			"**Level:** "+player.level+"\t - "+
			"**GP:** "+(player.gp.toLocaleString(config.discord.locale)),
			"**Guild name:** "+player.guildName,
			"",
			"**Zeta count:** "+player.zetaCount+"\t - "+
			"**G13 count:** "+player.g13Count,
			"**G12 count:** "+player.g12Count+"\t - "+
			"**G11 count:** "+player.g11Count,
			"",
			"**Ground arena rank:** "+player.arena.char.rank+"\t - "+
			"**Ship rank:** "+player.arena.ship.rank,
			"",
			"**Number of chars:** "+player.charCount+"\t - "+
			"**Number of ships:** "+player.shipCount,
			"**Total number of unlocked units:** "+player.unitCount
		])
		.setTimestamp(player.updated)
		.setFooter(config.footer.message, config.footer.iconUrl);
	message.reply(richMsg);
};

exports.showWhoIs = function(user, nick, message) {
	let lines = [
			"**"+nick+" ID is:** "+user.id,
			"**"+nick+" creation date is:**", " "+user.createdAt,
			"**"+nick+" presence status is:** "+user.presence.status
		];
    let logPrefix = exports.logPrefix; // shortcut

	exports.getPlayerFromDiscordId(user.id, message, function(player) {
		if (player) {
			lines.push("**"+nick+" allycode is:** "+player.allycode);
		}
		if (user.presence.game && user.presence.game.name) {
			lines.push("**"+nick+" activity is:** "+user.presence.game.name);
		}
		richMsg = new RichEmbed()
			.setTitle("User information").setColor("GREEN")
			.setThumbnail(user.displayAvatarURL).setDescription(lines)
			.setTimestamp(message.createdTimestamp)
			.setFooter(config.footer.message, config.footer.iconUrl);
		message.channel.send(richMsg);
	});
};

exports.ucfirst = function (str) {
	//	discuss at: https://locutus.io/php/ucfirst/
	// original by: Kevin van Zonneveld (https://kvz.io)
	// bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
	// improved by: Brett Zamir (https://brett-zamir.me)
	//	 example 1: ucfirst('kevin van zonneveld')
	//	 returns 1: 'Kevin van zonneveld'

	str += '';
	var f = str.charAt(0).toUpperCase();

	return f + str.substr(1);
};

exports.updatePlayerDataInDb = function(player, message, callback) {
	let allycode = player.allycode;
    let logPrefix = exports.logPrefix; // shortcut

	if (!player.gp) {
		console.log(logPrefix()+"invalid GP for user:", player);
		return;
	}

	// Try to find the same user in the database:
	exports.getPlayerFromDatabase(allycode, message, function(oldPlVersion) {
		let lines = [];
		let msg = "";
		let sql = "INSERT INTO `evols` (allycode, unit_id, type, new_value) VALUES ?";

		// If the user was unknown, do no look for any evolution:
		if (oldPlVersion && oldPlVersion.gp) {
			// Check for evolutions:
			let newUnitCount = 0;
			let nbShips = 0;
			let oldCharsCount = oldPlVersion.unitsData.length;

			console.log(logPrefix()+"Old chars count:", oldCharsCount);
			player.unitsData.forEach(function(u) {
				let oldUnit = oldPlVersion.unitsData[u.name];

				msg = "Evolution: "+player.name;

				// Compare old & new units:
				// Look for new units:
				if (typeof(oldUnit)==="undefined") {
					if (u.combatType===1) {
						if (oldCharsCount) { // New character:
							msg += " unlocked "+u.name;
							console.log(logPrefix()+msg);

							lines.push([allycode, u.name, "new", 1]);
						}
						++newUnitCount;
					} else ++nbShips;
					return;
				}

				// Look for new gears:
				if (u.gear > 11 && u.gear > oldUnit.gear) {
					msg += "'s "+u.name+" is now G"+u.gear;
					console.log(logPrefix()+msg);

					// Add new evolution in the database ("evols" table):
					lines.push([allycode, u.name, "gear", u.gear]);
				}

				// Look for new stars:
				if (oldUnit.stars > 0 && u.stars > 6 && u.stars > oldUnit.stars) {
					msg += "'s "+u.name+" is now "+u.stars+"*";
					console.log(logPrefix()+msg);

					// Add new evolution in the database ("evols" table):
					lines.push([allycode, u.name, "star", u.stars]);
				}

				// Look for new zetas:
				if (u.zetaCount > oldUnit.zetaCount) {
					msg += "'s "+u.name+" has now "+u.zetaCount+" zeta(s)";
					console.log(logPrefix()+msg);

					// Add new evolution in the database ("evols" table):
					lines.push([allycode, u.name, "zeta", u.zetaCount]);
				}
			});
			if (newUnitCount) {
				msg = "There is %d new unit(s) in %s's roster.";
				console.log(logPrefix()+msg, newUnitCount, player.name);
			}
			console.log(logPrefix()+"%s owns %d ships", player.name, nbShips);

			msg = lines.length+" evolution(s) detected for: "+player.name;
			console.log(logPrefix()+msg);
			if (lines.length) message.channel.send(msg);

			if (lines.length) {
				db_pool.query(sql, [lines], function(exc, result) {
					if (exc) {
						console.log("SQL:", sql);
						console.log(logPrefix()+"UC Exception:", exc.sqlMessage? exc.sqlMessage: exc);
						return;
					}

					console.log(logPrefix()+"%d evolution(s) inserted.", result.affectedRows);
				});
			}
		}

		// Remember user's stats:
		let update = new Date(player.updated);

		update = update.toISOString().replace("T", " ").replace(/z$/i, "");

		sql = "UPDATE users SET"+
			" game_name="+mysql.escape(player.name)+","+
			" gp="+player.gp+","+
			" g12Count="+player.g12Count+","+
			" g13Count="+player.g13Count+","+
			" guildRefId="+mysql.escape(player.guildRefId)+","+
			" zetaCount="+player.zetaCount+","+
			" ts="+mysql.escape(update)+" "+
			"WHERE allycode="+allycode;

		db_pool.query(sql, function(exc, result) {
			if (exc) {
				console.log("SQL:", sql);
				console.log(logPrefix()+"UC Exception:", exc.sqlMessage? exc.sqlMessage: exc);
				return;
			}

			console.log(logPrefix()+"%d user updated:", result.affectedRows, player.name);

			if (!result.affectedRows) {
				sql = "INSERT INTO `users`\n"+
					"(allycode, game_name, gp, g12Count, g13Count, guildRefId, zetaCount)\n"+
					"VALUES ("+allycode+", "+mysql.escape(player.name)+
					", "+player.gp+", "+player.g12Count+", "+player.g13Count+
					", "+mysql.escape(player.guildRefId)+", "+player.zetaCount+")";

				db_pool.query(sql, function(exc, result) {
					if (exc) {
						console.log("SQL:", sql);
						console.log(logPrefix()+"GC Exception:", exc.sqlMessage? exc.sqlMessage: exc);
						return;
					}

					console.log(logPrefix()+"%d user inserted:", result.affectedRows, player.name);
				});
			}
		});

		if (player.unitsData && player.unitsData.length) {
			let lines = [];

			// See:
			// https://www.w3schools.com/nodejs/shownodejs_cmd.asp?filename=demo_db_insert_multiple
			sql = "REPLACE `units` (allycode, name, combatType, gear, gp, relic, stars, zetaCount) VALUES ?";
			player.unitsData.forEach(function(u) { // u = current unit
				lines.push(
					[u.allycode, u.name, u.combatType, u.gear, u.gp, u.relic, u.stars, u.zetaCount]
				);
			});

			db_pool.query(sql, [lines], function(exc, result) {
				if (exc) {
					console.log("SQL:", sql);
					console.log(logPrefix()+"RU Exception:", exc.sqlMessage? exc.sqlMessage: exc);
					return;
				}

				let nbr = result.affectedRows; // shortcut for number of records
				console.log(logPrefix()+"%d unit records updated (%d fresh units).", nbr, lines.length);

				if (typeof(callback)==="function") callback(player, message);
			});
		} else
				if (typeof(callback)==="function") callback(player, message);
	});
};
