/**
 * jk-bot.js: main file for Juke's Discord bot for the SWGoH game
 * @author PixEye@pixeye.net
 */

// jshint esversion: 8

console.log(Date()+" - Loading...");

// Extract the required classes from the discord.js module:
const { Client, RichEmbed } = require("discord.js");

// Create an instance of a Discord client:
const client = new Client();

// Get the configuration from a separated JSON file:
const config = require("./config.json");

// Database connection:
const mysql = require("mysql");

// Remember when this program started:
const start = Date();

// SWGoH API:
const swgoh = require("./swgoh");

const db_pool = mysql.createPool({
	connectionLimit: config.conMaxCount,
	database       : config.db.name,
	host           : config.db.host,
	password       : config.db.pw,
	user           : config.db.user
});

// Start listening:
client.on("ready", () => {
	console.log(Date()+" - I am ready and listening.");
	client.user.username = config.username;
	client.user.setPresence({game: {name: config.prefix + "help", type: "listening"}});
});

// Get errors (if any):
client.on("error", (exc) => {
	console.log(Date()+" - Client exception!", exc.error? exc.error: exc);
});

// Check for input messages:
client.on("message", (message) => {
	var allycode = 0;
	var args = [];
	var command = "";
	var lines = [];
	var nick = {};
	var richMsg = {};
	var sql = "";
	var user = message.author;

	function getPlayerFromDiscordId(discord_id, callback)
	{
		let sql = "SELECT * FROM users WHERE discord_id="+parseInt(discord_id);

		db_pool.query(sql, function(exc, result) {
			if (exc) {
				console.log("SQL:", sql);
				console.log(Date()+" - GPFDI Exception:", exc.sqlMessage? exc.sqlMessage: exc);

				if (typeof(callback)==="function") callback(null);
				return null;
			}

			console.log(Date()+" - "+result.length+" record match(es) user's ID:", discord_id);
			// console.dir(result);
			if (result.length === 1) {
				console.log(Date()+" - Found allycode:", result[0].allycode);

				if (typeof(callback)==="function") callback(result[0]);
				return result[0];
			}

			console.log(Date()+" - Allycode not found!");
			message.reply("I don't know this player. Register her/him first please.");

			if (typeof(callback)==="function") callback(null);
			return null;
		});
	}

	// Filter with the prefix & ignore bots:
	if ( message.author.bot ||
		(message.channel.type!=="dm" && !message.content.toLowerCase().startsWith(config.prefix))) {
		return; // stop parsing the message
	}

	if (message.channel.type==="dm") {
		args = message.content.trim().replace(config.prefix, "").trim().split(/ +/g);
	} else {
		args = message.content.slice(config.prefix.length).trim().split(/ +/g);
	}
	command = args.shift().toLowerCase();
	nick = user.username;

	console.log(Date()+" - / \""+user.username+"\" sent command: "+message.content);

	// public commands:
	switch (command) {
		case "admin":
			if(message.author.id !== config.ownerID) {
				message.reply("You're not my master! :imp:");
			} else {
				message.reply("Yes master?");
			}
			break;

		case "aide":
			richMsg = new RichEmbed().setTitle("Aide")
				.setDescription([
					"**Voici déjà une liste des commandes utilisateur (sans explication) :**",
					" aide, allycode (ac), checkmods (cm), dis, guildstats (gs), help, playerstats (ps)"+
					", register (reg), relics, repete, self(y), start, stats, status"+
					", whoami, whois",
					"**Commandes pour l'administrateur :** admin, query/req(uest), stop/stoppe",
					"**NB :** en mp, le préfixe est optionnel"
				]).setFooter(config.footer.message, config.footer.iconUrl);
			message.channel.send(richMsg);
			break;

		case "ac":
		case "allycode":
			let search = args.join(" ").replace("'", "");
			let searchStr = "users.discord_name LIKE '%"+search+"%' OR users.game_name LIKE '%"+search+"%'";

			// Extract user's tag (if any):
			if (message.mentions && message.mentions.users && message.mentions.users.first()) {
				user = message.mentions.users.first();
				search = user.id;
				searchStr = "users.discord_id="+search;
			} else if (args.join("").trim()==="") {
				search = user.id;
				searchStr = "users.discord_id="+search;
			}

			sql = "SELECT * FROM users WHERE "+searchStr;
			db_pool.query(sql, function(exc, result) {
				if (exc) {
					console.log("SQL:", sql);
					console.log(Date()+" - AC Exception:", exc.sqlMessage? exc.sqlMessage: exc);
				} else {
					console.log(Date()+" - "+result.length+" record match(es):", search);
					// console.dir(result);
					if (result.length !== 1) {
						console.log(Date()+" - %d result(s) match allycode: %s", result.length, allycode);
						message.channel.send(result.length+" match(es)! Please be more specific.");
					} else {
						user = result[0];
						console.log(Date()+" - %s's allycode is:", user.discord_name, user.allycode);
						message.channel.send(user.discord_name+"'s allycode is: "+user.allycode);
					}
				}
			});
			break;

		case "cm":
		case "chkmod":
		case "chkmods":
		case "checkmod":
		case "checkmods":
			// Extract user's tag (if any):
			if (message.mentions && message.mentions.users && message.mentions.users.first()) {
				user = message.mentions.users.first();
				nick = user.username;
			}

			if (args.join("").trim().length>0) {
				// Try to find an ally code in the args:
				args.forEach(function(arg) {
					if (arg.indexOf('<')<0) { // ignore tags
						allycode = parseInt(arg.replace(/[^0-9]/g, ""));
						console.log(Date()+" - Found allycode:", allycode);
					}
				});
			}

			if (allycode) {
				getPlayerStats(allycode, message, checkPlayerMods);
			} else {
				console.log(Date()+" - Try with user ID:", user.id);
				getPlayerFromDiscordId(user.id, function(player) {
					if (player) getPlayerStats(player.allycode, message, checkPlayerMods);
				});
			}
			break;

		case "destroy":
		case "leave":
		case "stutdown":
		case "stop":
		case "stoppe":
			if(message.author.id !== config.ownerID) {
				message.reply("You're not my master! :imp:");
			} else {
				message.reply("Up to your will master. Leaving...");
				console.log(Date()+" - Stopping!");

				db_pool.end(function(exc) {
					console.log(Date()+" - DB connection stopped.");
				});
				client.destroy();
			}
			break;

		case "dis":
		case "repeat":
		case "repete":
		case "say":
			message.channel.send(args.join(" "));
			break;

		case "gs":
		case "guildstat":
		case "guildstats":
			function showGuildStats(allycode) {
				if (!allycode) {
					message.reply(":red_circle: Invalid or missing allycode!");
					return;
				}

				message.channel.send("Looking for stats of guild with ally: "+allycode+"...");

				swgoh.getPlayerGuild(allycode, message, function(guild) {
					if (!guild.gp) {
						console.log(Date()+" - invalid guild GP:", guild.gp);
						return;
					}

					// Remember user's stats:
					sql = "REPLACE INTO guilds (swgoh_id, name) VALUES ("+
						mysql.escape(guild.id)+", "+
						mysql.escape(guild.name)+")";

					db_pool.query(sql, function(exc, result) {
						if (exc) {
							console.log("SQL:", sql);
							let otd = exc.sqlMessage? exc.sqlMessage: exc;
							// otd = object to display
							console.log(Date()+" - GS Exception:", otd);
							return;
						}

						console.log(Date()+" - %d guild updated.", result.affectedRows);
					});
				});
			}

			// Extract user's tag (if any):
			if (message.mentions && message.mentions.users && message.mentions.users.first()) {
				user = message.mentions.users.first();
				nick = user.username;
			}

			if (args.join("").trim().length>0) {
				// Try to find an ally code in the args:
				args.forEach(function(arg) {
					if (arg.indexOf('<')<0) { // ignore tags
						allycode = parseInt(arg.replace(/[^0-9]/g, ""));
						console.log(Date()+" - Found allycode:", allycode);
					}
				});
			}

			if (allycode) {
				showGuildStats(allycode);
			} else {
				console.log(Date()+" - Try with user ID:", user.id);
				getPlayerFromDiscordId(user.id, function(player) {
					if (player) showGuildStats(player.allycode);
				});
			}
			break;

		case "help":
			richMsg = new RichEmbed().setTitle("Help")
				.setDescription([
					"**Here is a quick list of user commands (without explanation):**",
					" aide, allycode (ac), checkmods (cm), guildstats (gs), help, playerstat (ps)"+
					", register (reg), relics, repeat, say, self(y), start, stats, status"+
					", whoami, whois",
					"**Admin commands:** admin, destroy/leave/shutdown/stop, query/req(uest)",
					"**NB :** in DM, the prefix is optional"
				]).setFooter(config.footer.message, config.footer.iconUrl);
			message.channel.send(richMsg);
			break;

		case "pi":
		case "ps":
		case "playerinfo":
		case "playerstat":
		case "playerstats":
			// Extract user's tag (if any):
			if (message.mentions && message.mentions.users && message.mentions.users.first()) {
				user = message.mentions.users.first();
				nick = user.username;
			}

			if (args.join("").trim().length>0) {
				// Try to find an ally code in the args:
				args.forEach(function(arg) {
					if (arg.indexOf('<')<0) { // ignore tags
						allycode = parseInt(arg.replace(/[^0-9]/g, ""));
						console.log(Date()+" - Found allycode:", allycode);
					}
				});
			}

			if (allycode) {
				getPlayerStats(allycode, message, showPlayerStats);
			} else {
				console.log(Date()+" - Try with user ID:", user.id);
				getPlayerFromDiscordId(user.id, function(player) {
					if (player) getPlayerStats(player.allycode, message, showPlayerStats);
				});
			}
			break;

		case "reg":
		case "register":
			// Extract user's tag (if any):
			if (message.mentions && message.mentions.users && message.mentions.users.first()) {
				user = message.mentions.users.first();
				nick = user.username;
			}

			// Try to find an ally code in the args:
			args.forEach(function(arg) {
				if (arg.indexOf('<')<0) { // ignore tags
					allycode = parseInt(arg.replace(/[^0-9]/g, ""));
					console.log(Date()+" - Found allycode:", allycode);
				}
			});
			if (!allycode) {
				message.reply(":warning: Allycode is invalid or missing!");
				return;
			}

			sql = "INSERT INTO users (discord_id, discord_name, allycode)"+
				" VALUES ("+user.id+', '+mysql.escape(nick)+', '+allycode+")";

			// Register:
			db_pool.query(sql, function(exc, result) {
				if (exc) {
					console.log("SQL:", sql);
					if (exc.sqlMessage) {
						console.log(Date()+ " - IU1 Exception:", exc.sqlMessage);
						// message.reply(":red_circle: Error: "+exc.sqlMessage);
						result = {affectedRows: 0};
					} else {
						console.log(Date()+" - IU2 Exception:", exc);
						message.reply(":red_circle: Error!");
						return;
					}
				}

				if (result.affectedRows) {
					message.reply(":white_check_mark: Done.");
					console.log(Date()+" - %d user inserted.", result.affectedRows);
					return;
				}

				sql = "UPDATE users"+
					" SET discord_id="+user.id+", discord_name="+mysql.escape(nick)+
					" WHERE allycode="+allycode;

				// Update an existing registration:
				db_pool.query(sql, function(exc, result) {
					if (exc) {
						console.log("SQL:", sql);
						if (exc.sqlMessage) {
							console.log(Date()+ " - UU1 Exception:", exc.sqlMessage);
							message.reply(":red_circle: Error: "+exc.sqlMessage);
						} else {
							console.log(Date()+" - UU2 Exception:", exc);
							message.reply(":red_circle: Error!");
						}
					} else {
						message.reply(":white_check_mark: Done.");
						console.log(Date()+" - %d user updated.", result.affectedRows);
					}
				});
			});
			break;

		case "relics":
			// Extract user's tag (if any):
			if (message.mentions && message.mentions.users && message.mentions.users.first()) {
				user = message.mentions.users.first();
				nick = user.username;
			}

			if (args.join("").trim().length>0) {
				// Try to find an ally code in the args:
				args.forEach(function(arg) {
					if (arg.indexOf('<')<0) { // ignore tags
						allycode = parseInt(arg.replace(/[^0-9]/g, ""));
						console.log(Date()+" - Found allycode:", allycode);
					}
				});
			}

			if (allycode) {
				getPlayerStats(allycode, message, showPlayerRelics);
			} else {
				console.log(Date()+" - Try with user ID:", user.id);
				getPlayerFromDiscordId(user.id, function(player) {
					if (player) getPlayerStats(player.allycode, message, showPlayerRelics);
				});
			}
			break;

		case "req":
		case "sql":
		case "query":
		case "request":
			if(message.author.id !== config.ownerID) {
				message.reply("You're not my master! :imp:");
				return;
			}

			sql = args.join(" ");
			db_pool.query(sql, function(exc, result) {
				let col = "ORANGE";

				if (exc) {
					console.log("SQL:", sql);
					console.log(Date()+" - RQ Exception:", exc.sqlMessage? exc.sqlMessage: exc.code);

					col = "RED";
					lines = [exc.sqlMessage? exc.sqlMessage: exc.code];
				} else {
					console.log(Date()+" - %d record(s) in the result", result.length);

					if (!result.length) {
						lines = ["No match."];
					} else {
						let headers = [];
						let col_sep = ";";

						col = "GREEN";
						result.forEach(function(record) {
							headers = Object.keys(record);
							lines.push("`"+Object.values(record).join(col_sep)+"`");
						});
						lines.unshift("`"+headers.join(col_sep)+"`");
					}
				}

				richMsg = new RichEmbed()
					.setTitle("DB request").setColor(col)
					.setDescription(lines)
					.setFooter(config.footer.message, config.footer.iconUrl);
				message.channel.send(richMsg);
			});
			break;

		case "stats":
		case "memstat":
			sql = "SELECT COUNT(u.id) AS cnt, g.name";
			sql+= " FROM `guilds` g, `users` u";
			sql+= " WHERE u.guildRefId=g.swgoh_id"; // join
			sql+= " GROUP BY guildRefId";
			sql+= " ORDER BY cnt DESC, g.name ASC";

			db_pool.query(sql, function(exc, result) {
				let tpc = 0; // total player count

				if (exc) {
					console.log("SQL:", sql);
					console.log(Date()+" - MS Exception:", exc.sqlMessage? exc.sqlMessage: exc.code);
					return;
				}

				console.log(Date()+" - %d guilds in the result", result.length);

				if (result.length) {
					lines.push("");
					result.forEach(function(record) {
						tpc+= record.cnt;
						lines.push(record.cnt+" player(s) in: "+record.name);
					});
				}
				console.log(Date()+" - %d guilds & %d players in the result", result.length, tpc);
				lines.unshift("**"+tpc+" players registered in "+result.length+" guilds**");

				richMsg = new RichEmbed()
					.setTitle("Memory status").setColor("GREEN")
					.setDescription(lines)
					.setFooter(config.footer.message, config.footer.iconUrl);
				message.channel.send(richMsg);
			});
			break;

		case "start":
		case "status":
			let nbg = 0; // number of registered guilds
			let nbp = 0; // number of registered players

			message.channel.send("I am listening since: "+start);

			sql = "SELECT COUNT(*) AS nbg FROM guilds";
			db_pool.query(sql, countGuilds);

			function countGuilds(exc, result) {
				if (exc) {
					console.log("SQL:", sql);
					console.log(Date()+" - ST2 Exception:", exc.sqlMessage? exc.sqlMessage: exc);
					message.reply("Exception: failed to count registered guilds!");
					return;
				}

				if (result.length !== 1) {
					console.log(Date()+" - "+result.length+" result(s) to count guilds!");
					message.reply("Failed to count registered guilds!");
					return;
				}

				nbg = result[0].nbg; // nbg = number of guilds
				console.log(Date()+" - %d guild(s) registered.", nbg);

				sql = "SELECT COUNT(*) AS nbp FROM users"; // nbp = number of players
				db_pool.query(sql, countPlayers);
			}

			function countPlayers(exc, result) {
				if (exc) {
					console.log("SQL:", sql);
					console.log(Date()+" - ST1 Exception:", exc.sqlMessage? exc.sqlMessage: exc.code);
					message.reply("Exception: failed to count registered players!");
					return;
				}

				if (result.length !== 1) {
					console.log(Date()+" - "+result.length+" result(s) to count users!");
					message.reply("Failed to count registered users!");
					return;
				}

				nbp = result[0].nbp; // nbp = number of players
				console.log(Date()+" -", nbg+" guilds & "+nbp+  " users registered.");
				message.channel.send(    nbg+" guilds & "+nbp+" players registered.");
			}
			break;

		case "self":
		case "selfy":
			user = client.user;
			nick = "My";
			showWhoIs(user, nick);
			break;

		case "whois":
			if (message.mentions && message.mentions.users && message.mentions.users.first()) {
				user = message.mentions.users.first();
				nick = user.username;
			} else
			if (command!=="self" && command!=="selfy" && message.mentions && message.mentions.users) {
				message.reply("Cannot answer for the moment.");

				console.log(Date()+" - Mentions:");
				console.dir(message.mentions.users);

				return;
			} else if (command!=="self" && command!=="selfy") {
				message.reply("No user specified!");
				return;
			}
			showWhoIs(user, nick);
			break;

		case "whoami":
			nick = (nick==="My")? nick: (nick+"'s");
			showWhoIs(user, nick);
			break;

		default:
			message.reply("I don't get it. :thinking:");
			console.log(Date()+" - Unknown command was: "+command);
	}
});

function getPlayerStats(allycode, message, callback)
{
	if (!allycode) {
		message.reply(":red_circle: Invalid or missing allycode! Try 'register' command.");
		return;
	}

	message.channel.send("Looking for "+allycode+"'s stats...");

	swgoh.getPlayerData(allycode, message, callback);
}

function checkPlayerMods(player, message)
{
	if (!player.gp) {
		console.log(Date()+" - invalid GP for player:", player);
		return;
	}

	updatePlayerDataInDb(player);

	let color = "GREEEN";
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
	console.log(Date()+" - %d unit(s) with missing modules found.", n);
	// console.dir(player.unitsData);

	if (n === 0) {
		let msg = "";

		console.log(Date()+" - There is 0 known units with missing modules in this roster.");
		lines = ["All player's characters have "+maxModsCount+" modules."];
	} else {
		color = "ORANGE";
		unitsWithoutAllModules.forEach(function(unit, i) {
			tpmmc += maxModsCount - unit.mods.length;
			if (i<10)
				lines.push((maxModsCount-unit.mods.length)+" missing module(s) on: (GP="+unit.gp+") "+unit.name);
			else if (i===10)
				lines.push("And "+(n-10)+" more...");
		});
		console.log(Date()+" - %d total character(s) with %d total missing modules found.", tpmmc, maxModsCount);
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
}

function showPlayerRelics(player, message)
{
	if (!player.gp) {
		console.log(Date()+" - invalid GP for player:", player);
		return;
	}

	updatePlayerDataInDb(player);

	let color = "GREEEN";
	let lines = [];
	let n = 0;
	let unitsWithRelics = player.unitsData.filter(function(unit) {
			return unit.relic>0; // main filter
		}).sort(function(a, b) {
			return b.relic-a.relic; // sort by relic count (descending)
		});
	let tprc = 0; // total player's relic count

	n = unitsWithRelics.length;
	console.log(Date()+" - %d unit(s) with relic found.", n);
	// console.dir(player.unitsData);

	if (n === 0) {
		let msg = "";

		color = "ORANGE";
		console.log(Date()+" - There is 0 known relics in this roster.");
		lines = ["I don't know any relic in this roster for the moment."];
	} else {
		unitsWithRelics.forEach(function(unit, i) {
			tprc += unit.relic;
			if (i<10)
				lines.push(unit.relic+" relic(s) on: "+unit.name);
			else if (i===10)
				lines.push("And "+(n-10)+" more...");
		});
		console.log(Date()+" - %d total relic(s) found.", tprc);
	}

	richMsg = new RichEmbed()
		.setTitle("Player has "+n+" unit(s) with "+tprc+" relic(s)")
		.setDescription(lines).setColor(color)
		.setTimestamp(player.updated)
		.setFooter(config.footer.message, config.footer.iconUrl);
	message.channel.send(richMsg);

	player.unitsData.forEach(function(u) { // u = current unit
		lines.push(
			[u.allycode, u.name, u.combatType, u.gear, u.gp, u.relic, u.zetaCount]
		);
	});
}

function showPlayerStats(player, message)
{
	if (!player.gp) {
		console.log(Date()+" - invalid GP for player:", player);
		return;
	}

	updatePlayerDataInDb(player);

	let locale = "fr-FR";
	let richMsg = new RichEmbed().setTitle(player.name+"'s profile").setColor("GREEN")
		.setDescription([
			"**Level:** "+player.level+"\t - "+
			"**GP:** "+(player.gp.toLocaleString(locale)),
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
}

function showWhoIs(user, nick)
{
	let lines = [
			"**"+nick+" ID is:** "+user.id,
			"**"+nick+" creation date is:**", " "+user.createdAt,
			"**"+nick+" presence status is:** "+user.presence.status
		];

	getPlayerFromDiscordId(user.id, function(player) {
		if (player) {
			lines.push("**"+nick+" allycode is:** "+player.allycode);
		}
		if (user.presence.game && user.presence.game.name) {
			lines.push("**"+nick+" activity is:** "+user.presence.game.name);
		}
		richMsg = new RichEmbed()
			.setTitle("User information").setColor("GREEN")
			.setThumbnail(user.displayAvatarURL).setDescription(lines)
			.setFooter(config.footer.message, config.footer.iconUrl);
		message.channel.send(richMsg);
	});
}

function updatePlayerDataInDb(player)
{
	let allycode = player.allycode;

	if (!player.gp) {
		console.log(Date()+" - invalid GP for player:", player);
		return;
	}

	// Remember user's stats:
	let sql = "UPDATE users SET"+
		" game_name="+mysql.escape(player.name)+","+
		" gp="+player.gp+","+
		" g12Count="+player.g12Count+","+
		" g13Count="+player.g13Count+","+
		" guildRefId="+mysql.escape(player.guildRefId)+","+
		" zetaCount="+player.zetaCount+" "+
		"WHERE allycode="+allycode;

	db_pool.query(sql, function(exc, result) {
		if (exc) {
			console.log("SQL:", sql);
			console.log(Date()+" - UC Exception:", exc.sqlMessage? exc.sqlMessage: exc);
			return;
		}

		console.log(Date()+" - %d user updated.", result.affectedRows);

		if (!result.affectedRows) {
			sql = "INSERT INTO users\n"+
				"(allycode, game_name, gp, g12Count, g13Count, guildRefId, zetaCount)\n"+
				"VALUES ("+allycode+", "+mysql.escape(player.name)+
				", "+player.gp+", "+player.g12Count+", "+player.g13Count+
				", "+mysql.escape(player.guildRefId)+", "+player.zetaCount+")";

			db_pool.query(sql, function(exc, result) {
				if (exc) {
					console.log("SQL:", sql);
					console.log(Date()+" - GC Exception:", exc.sqlMessage? exc.sqlMessage: exc);
					return;
				}

				console.log(Date()+" - %d user inserted.", result.affectedRows);
			});
		}
	});
}

// Main:
client.login(config.token);

// vim: noexpandtab shiftwidth=4 softtabstop=4 tabstop=4
