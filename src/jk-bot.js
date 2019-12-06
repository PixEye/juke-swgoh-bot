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
	console.log(Date()+" - Client exception!\n %s: %s", exc.type, exc.message? exc.message: exc);
});

// Check for input messages:
client.on("message", (message) => {
	var allycode = 0;
	var args = [];
	var command = "";
	var lines = [];
	var msg = "";
	var nick = "";
	var richMsg = {};
	var sql = "";
	var user = message.author;

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
		case "about":
			msg = "This bot is written by Juke (Discor #4992) also known as PixEye.";
			richMsg = new RichEmbed().setTitle("About").setColor("GREEN")
				.setDescription([msg]).setTimestamp(message.createdTimestamp)
				.setFooter(config.footer.message, config.footer.iconUrl);
			message.channel.send(richMsg);
			break;

		case "admin":
			if(message.author.id !== config.ownerID) {
				message.reply("You're not my master! :imp:");
			} else {
				message.reply("Yes master?");
			}
			break;

		case "aide":
			richMsg = new RichEmbed().setTitle("Liste des commandes")
				.setDescription([
					"**Commandes utilisateur :**",
					" about, aide, allycode (ac), charInfo (ci), checkMods (cm), checkUnitsGp (cugp)"+
					", dis, guildStats (gs), help, invite, (last)evols (le), playerStats (ps)"+
					", register (reg), relics, repete, self(y), start, stats, status, whoami, whois",
					"**Commandes pour l'administrateur :** admin, query/req(uest), stop/stoppe",
					"**NB :** en mp, le préfixe est optionnel."])
				.setTimestamp(message.createdTimestamp)
				.setFooter(config.footer.message, config.footer.iconUrl);
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

			sql = "SELECT * FROM `users` WHERE "+searchStr;
			db_pool.query(sql, function(exc, result) {
				if (exc) {
					console.log("SQL:", sql);
					console.log(Date()+" - AC Exception:", exc.sqlMessage? exc.sqlMessage: exc);
				} else {
					console.log(Date()+" - "+result.length+" record(s) match(es):", search);
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

		case "ci":
		case "charinfo":
		case "characterinfo":
			// Extract user's tag (if any):
			if (message.mentions && message.mentions.users && message.mentions.users.first()) {
				user = message.mentions.users.first();
				nick = user.username;
			}

			allycode = getFirstAllycodeInWords(args);

			// Look for a character name:
			args.forEach(function(word) {
				// ignore tags/mentions & allycodes:
				if (word.indexOf("<")<0 && ! word.match(/[0-9]{3,}/)) {
					msg+= " "+ucfirst(word);
				}
			});

			if (!msg) {
				console.warn( "No character name found in the message!" );
				message.reply("No character name found in your message!");
				return;
			}

			msg = msg.trim();
			console.log(Date()+" - Character to look for is:", msg);
			if (allycode) {
				getPlayerStats(allycode, message, function(player, message) {
					return showCharInfo(player, message, msg);
				});
			} else {
				console.log(Date()+" - Try with user ID:", user.id);
				getPlayerFromDiscordId(user.id, message, function(player) {
					if (player) getPlayerStats(player.allycode, message, function(player, message) {
						return showCharInfo(player, message, msg);
					});
				});
			}
			break;

		case "cgp":
		case "cugp":
		case "chkgp":
		case "checkgp":
		case "checkunitsgp":
			// Extract user's tag (if any):
			if (message.mentions && message.mentions.users && message.mentions.users.first()) {
				user = message.mentions.users.first();
				nick = user.username;
			}

			let limit = 21;
			allycode = getFirstAllycodeInWords(args);
			if (allycode) {
				getPlayerStats(allycode, message, function(player, message) {
					return checkUnitsGp(player, message, limit);
				});
			} else {
				console.log(Date()+" - Try with user ID:", user.id);
				getPlayerFromDiscordId(user.id, message, function(player) {
					if (player) {
						getPlayerStats(player.allycode, message, function(player, message) {
							return checkUnitsGp(player, message, limit);
						});
					}
				});
			}
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

			allycode = getFirstAllycodeInWords(args);
			if (allycode) {
				getPlayerStats(allycode, message, checkPlayerMods);
			} else {
				console.log(Date()+" - Try with user ID:", user.id);
				getPlayerFromDiscordId(user.id, message, function(player) {
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
			// Extract user's tag (if any):
			if (message.mentions && message.mentions.users && message.mentions.users.first()) {
				user = message.mentions.users.first();
				nick = user.username;
			}

			allycode = getFirstAllycodeInWords(args);
			if (allycode) {
				getGuildStats(allycode, message);
			} else {
				console.log(Date()+" - Try with user ID:", user.id);
				getPlayerFromDiscordId(user.id, message, function(player) {
					if (player) getGuildStats(player.allycode, message);
				});
			}
			break;

		case "help":
			richMsg = new RichEmbed().setTitle("Avialable commands")
				.setDescription([
					"**User commands:**",
					" about, aide, allycode (ac), charInfo (ci), checkMods (cm), checkUnitsGp (cugp)"+
					", guildStats (gs), help, invite, (last)evols (le), playerStat (ps), register (reg)"+
					", relics, repeat, say, self(y), start, stats, status, whoami, whois",
					"**Admin commands:** admin, destroy/leave/shutdown/stop, query/req(uest)",
					"**NB:** in DM, the prefix is optional."])
				.setTimestamp(message.createdTimestamp)
				.setFooter(config.footer.message, config.footer.iconUrl);
			message.channel.send(richMsg);
			break;

		case "invite":
			// https://discordapp.com/api/oauth2/authorize?client_id=629346604075450399&permissions=2112&scope=bot
			msg = "Follow this link to invite me to your server(s): http://bit.ly/JukeSwgohBot";
			richMsg = new RichEmbed().setTitle("Invite").setColor("GREEN")
				.setDescription([msg]).setTimestamp(message.createdTimestamp)
				.setFooter(config.footer.message, config.footer.iconUrl);
			message.channel.send(richMsg);
			break;

		case "le":
		case "evol":
		case "evols":
		case "lastevols":
			// Extract user's tag (if any):
			if (message.mentions && message.mentions.users && message.mentions.users.first()) {
				user = message.mentions.users.first();
				nick = user.username;
			}

			allycode = getFirstAllycodeInWords(args);
			if (allycode) {
				getPlayerStats(allycode, message, getLastEvols);
			} else {
				console.log(Date()+" - Try with user ID:", user.id);
				getPlayerFromDiscordId(user.id, message, function(player) {
					if (player) getPlayerStats(player.allycode, message, getLastEvols);
				});
			}
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

			allycode = getFirstAllycodeInWords(args);
			if (allycode) {
				getPlayerStats(allycode, message, showPlayerStats);
			} else {
				console.log(Date()+" - Try with user ID:", user.id);
				getPlayerFromDiscordId(user.id, message, function(player) {
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

			allycode = getFirstAllycodeInWords(args);
			if (!allycode) {
				message.reply(":warning: Allycode is invalid or missing!");
				return;
			}

			sql = "INSERT INTO users (discord_id, discord_name, allycode)"+
				" VALUES ("+user.id+", "+mysql.escape(nick)+", "+allycode+")";

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
					console.log(Date()+" - %d user inserted:", result.affectedRows, nick);
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
						console.log(Date()+" - %d user updated:", result.affectedRows, nick);
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

			allycode = getFirstAllycodeInWords(args);
			if (allycode) {
				getPlayerStats(allycode, message, showPlayerRelics);
			} else {
				console.log(Date()+" - Try with user ID:", user.id);
				getPlayerFromDiscordId(user.id, message, function(player) {
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
						let col_sep = "\t";

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
					.setTimestamp(message.createdTimestamp)
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
				console.log(Date()+" - %d guilds & %d users in the result", result.length, tpc);
				lines.unshift("**"+tpc+" player(s) registered in "+result.length+" guilds**");

				richMsg = new RichEmbed()
					.setTitle("Memory status").setColor("GREEN")
					.setDescription(lines)
					.setTimestamp(message.createdTimestamp)
					.setFooter(config.footer.message, config.footer.iconUrl);
				message.channel.send(richMsg);
			});
			break;

		case "start":
		case "status":
			let nbg = 0; // number of registered guilds
			let nbp = 0; // number of registered players

			message.channel.send("I am listening since: "+start);

			sql = "SELECT COUNT(`id`) AS nbg FROM `guilds`";
			db_pool.query(sql, countGuilds);

			function countGuilds(exc, result) {
				if (exc) {
					console.log("SQL:", sql);
					console.log(Date()+" - ST1 Exception:", exc.sqlMessage? exc.sqlMessage: exc);
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

				sql = "SELECT COUNT(`id`) AS nbp FROM `users`"; // nbp = number of players
				db_pool.query(sql, countPlayers);
			}

			function countPlayers(exc, result) {
				if (exc) {
					console.log("SQL:", sql);
					console.log(Date()+" - ST2 Exception:", exc.sqlMessage? exc.sqlMessage: exc.code);
					message.reply("Exception: failed to count registered players!");
					return;
				}

				if (result.length !== 1) {
					console.log(Date()+" - "+result.length+" result(s) to count users!");
					message.reply("Failed to count registered users!");
					return;
				}

				nbp = result[0].nbp; // nbp = number of players
				let avg = nbg? Math.round(nbp/nbg): nbp; // average per guild
				console.log(Date()+" - %d user(s) registered (~%d per guild).", nbp, avg);

				sql = "SELECT COUNT(`id`) AS nbu FROM `units`"; // nbp = number of units
				db_pool.query(sql, countUnits);
			}

			function countUnits(exc, result) {
				if (exc) {
					console.log("SQL:", sql);
					console.log(Date()+" - ST3 Exception:", exc.sqlMessage? exc.sqlMessage: exc.code);
					message.reply("Exception: failed to count registered players!");
					return;
				}

				if (result.length !== 1) {
					console.log(Date()+" - "+result.length+" result(s) to count users!");
					message.reply("Failed to count registered units!");
					return;
				}

				let nbu = result[0].nbu; // nbu = number of units
				let avg = nbp? Math.round(nbu/nbp): nbu; // average per player
				console.log(Date()+" - %d unit(s) registered (~%d per user).", nbu, avg);

				message.channel.send(nbg+" guilds, "+nbp+" players & "+nbu+" unit(s) registered.");
			}
			break;

		case "self":
		case "selfy":
			user = client.user;
			nick = "My";
			showWhoIs(user, nick, message);
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
			showWhoIs(user, nick, message);
			break;

		case "whoami":
			nick = (nick==="My")? nick: (nick+"'s");
			showWhoIs(user, nick, message);
			break;

		default:
			message.reply("I don't get it. :thinking:");
			console.log(Date()+" - Unknown command was: "+command);
	}
});

/** Try to find an ally code in the words of the user's message */
function getFirstAllycodeInWords(words)
{
	var allycode = 0;

	if (words.join("").trim().length>0) {
		words.forEach(function(word) {
			if (word.indexOf("<")<0 && word.match(/[0-9]{3,}/)) { // ignore tags/mentions
				allycode = parseInt(word.replace(/[^0-9]/g, ""));
				console.log(Date()+" - Found allycode:", allycode);
			}
		});
	}

	return allycode;
}

function getLastEvols(player, message)
{
	let allycode = player.allycode;
	let sql = "SELECT * FROM `evols`"+
		" WHERE allycode="+parseInt(allycode)+
		" ORDER BY `id` DESC LIMIT 11";

	updatePlayerDataInDb(player, message);

	db_pool.query(sql, function(exc, result) {
		if (exc) {
			let otd = exc.sqlMessage? exc.sqlMessage: exc;
			// otd = object to display

			console.log("SQL:", sql);
			console.log(Date()+" - GLA Exception:", otd);
			return;
		}

		console.log(Date()+" - %d evols match allycode:", result.length, allycode);

		showLastEvols(player, message, result);
	});
}

function getGuildStats(allycode, message)
{
	if (!allycode) {
		message.reply(":red_circle: Invalid or missing allycode!");
		return;
	}

	message.channel.send("Looking for stats of guild with ally: "+allycode+"...")
		.then(msg => {
			swgoh.getPlayerGuild(allycode, message, function(guild) {
				if (typeof(msg.delete)==="function") msg.delete();

				if (!guild.gp) {
					console.log(Date()+" - invalid guild GP:", guild.gp);
					return;
				}

				// Remember stats of the guild:
				sql = "REPLACE INTO guilds (swgoh_id, name) VALUES ("+
					mysql.escape(guild.id)+", "+
					mysql.escape(guild.name)+")";

				db_pool.query(sql, function(exc, result) {
					if (exc) {
						let otd = exc.sqlMessage? exc.sqlMessage: exc;
						// otd = object to display

						console.log("SQL:", sql);
						console.log(Date()+" - GS Exception:", otd);
						return;
					}

					console.log(Date()+" - %d guild updated.", result.affectedRows);
				});
			});
		})
		.catch(console.error);
}

function getPlayerFromdatabase(allycode, message, callback)
{
	let player = null;
	let sql = "SELECT * FROM `users` WHERE allycode="+parseInt(allycode);

	db_pool.query(sql, function(exc, result) {
		if (exc) {
			console.log("SQL:", sql);
			console.log(Date()+" - GPFAC1 Exception:", exc.sqlMessage? exc.sqlMessage: exc);

			if (typeof(callback)==="function") callback(null);
			return;
		}

		console.log(Date()+" - "+result.length+" record(s) match(es) allycode:", allycode);
		// console.dir(result);
		if (result.length === 1) {
			player = result[0];
			console.log(Date()+" - Found user:", player.discord_name);

			// Get player's units:
			sql = "SELECT * FROM `units` WHERE allycode="+parseInt(allycode);
			sql+= " AND `combatType`=1"; // keep only characters (exclude ships)

			db_pool.query(sql, function(exc, result) {
				if (exc) {
					console.log("SQL:", sql);
					console.log(Date()+" - GPFAC2 Exception:", exc.sqlMessage? exc.sqlMessage: exc);

					if (typeof(callback)==="function") callback(player);
					return;
				}

				// Add units to the player object:
				console.log(Date()+" - GPFAC get %d characters for:", result.length, player.discord_name);
				player.unitsData = {length: 0};
				result.forEach(function(u) {
					player.unitsData.length++;
					player.unitsData[u.name] = u;
				});

				if (typeof(callback)==="function") callback(player);
			});
			return;
		}

		console.log(Date()+" - User with allycode "+allycode+" not found!");
		message.reply("I don't know this player. Register her/him first please.");

		if (typeof(callback)==="function") callback(player);
	});
}

function getPlayerFromDiscordId(discord_id, message, callback)
{
	let sql = "SELECT * FROM `users` WHERE discord_id="+parseInt(discord_id);

	db_pool.query(sql, function(exc, result) {
		if (exc) {
			console.log("SQL:", sql);
			console.log(Date()+" - GPFDI Exception:", exc.sqlMessage? exc.sqlMessage: exc);

			if (typeof(callback)==="function") callback(null);
			return;
		}

		console.log(Date()+" - "+result.length+" record(s) match(es) user's ID:", discord_id);
		// console.dir(result);
		if (result.length === 1) {
			console.log(Date()+" - Found allycode:", result[0].allycode);

			if (typeof(callback)==="function") callback(result[0]);
			return;
		}

		console.log(Date()+" - Allycode not found"); // Normal for "self(y)" command
		message.reply("This user has no player ID. You may try: "+config.prefix+"register ally-code");

		if (typeof(callback)==="function") callback(null);
	});
}

function getPlayerStats(allycode, message, callback)
{
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
}

function checkPlayerMods(player, message)
{
	if (!player.gp) {
		console.log(Date()+" - invalid GP for user:", player);
		return;
	}

	updatePlayerDataInDb(player, message);

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
	console.log(Date()+" - %d unit(s) with missing modules found.", n);
	// console.dir(player.unitsData);

	if (n === 0) {
		let msg = "";

		console.log(Date()+" - There is 0 known units with missing modules in this roster.");
		lines = ["All player's level 50+ characters have "+maxModsCount+" modules."];
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

function checkUnitsGp(player, message, limit)
{
	if (!player.gp) {
		console.log(Date()+" - invalid GP for user:", player);
		return;
	}

	updatePlayerDataInDb(player, message);

	let color = "GREEN";
	let minit = limit-1;
	let lines = [];
	let maxGp = limit*1000;
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
	console.log(Date()+" - %d unit(s) on the border-line.", n);
	// console.dir(player.unitsData);

	if (n === 0) {
		let msg = "";

		console.log(Date()+" - There is 0 known units on the border line in this roster.");
		lines = ["There is no player's characters between "+minGp+" and "+maxGp+" of GP."];
	} else {
		color = "ORANGE";
		units.forEach(function(u, i) {
			if (i<10)
				lines.push("(GP="+u.gp+"; G"+u.gear+"; "+u.zetaCount+"z) "+u.name);
			else if (i===10)
				lines.push("And "+(n-10)+" more...");
		});
		console.log(Date()+" - %d total character(s) with GP between %dk & %dk.", n, minit, limit);
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
}

function showCharInfo(player, message, charName)
{
	if (!player.gp) {
		console.log(Date()+" - invalid GP for user:", player);
		return;
	}

	updatePlayerDataInDb(player, message);

	let color = "RED";
	let foundUnit = null;
	let hiddenFields = ["allycode", "combatType", "name"];
	let lines = [];
	let strToLookFor = charName.replace(/ /g, "").toUpperCase();

	console.log(Date()+" - Name to look for:", strToLookFor);

	player.unitsData.forEach(function(unit) {
		if (!foundUnit && unit.combatType===1 && unit.name.indexOf(strToLookFor)>=0) {
			color = "GREEN";
			foundUnit = unit;
		}
	});

	let richMsg = new RichEmbed().setTimestamp(player.updated).setColor(color)
		.setFooter(config.footer.message, config.footer.iconUrl);

	if (!foundUnit) {
		lines = ["Did not find a character with name: "+charName];
		richMsg.setDescription(lines).setTitle(player.name+"'s "+charName);
		message.reply(richMsg);
		return;
	}

	richMsg.setThumbnail("https://swgoh.gg/game-asset/u/"+foundUnit.name+"/")
		.setTitle(player.name+"'s "+charName+" ("+foundUnit.name+")");

	Object.keys(foundUnit).forEach(function(key) {
		if (hiddenFields.indexOf(key)<0) {
			richMsg.addField(ucfirst(key)+":", key==="mods"? foundUnit[key].length: foundUnit[key], true);
		}
	});
	message.channel.send(richMsg);
}

function showLastEvols(player, message, evols)
{
	let allycode = player.allycode;
	let color = "GREEN";
	let lines = [];
	let maxDays = 10;
	let maxDt = 0;
	let maxPeriod = 24 * 3600 * 1000 * maxDays;
	let msg = "";
	let n = 0;
	let now = new Date();
	let lastEvols = evols.filter(function(evol) {
			return (now.getTime() - evol.ts)<maxPeriod;
		});

	n = lastEvols.length;
	console.log(Date()+" - %d evol(s) found.", n);
	// console.dir(player.unitsData);

	if (n === 0) {
		let msg = "";

		color = "ORANGE";
		msg = "No evolution in this roster for the last "+maxDays+" days";
		console.log(Date()+" - "+msg);
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
				case "zeta":
					msg+= " get "+e.type+" #"+e.new_value;
					break;
				case "new":
					msg+= " unlocked.";
					break;
				default:
					msg+= " turned "+e.type+" to: "+e.new_value;
					console.warn("Unexpected evolution type '%s' at ID %d", e.type, e.id);
			}

			if (i<10)
				lines.push(msg);
			else if (i===10)
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
}

function showPlayerRelics(player, message)
{
	if (!player.gp) {
		console.log(Date()+" - invalid GP for user:", player);
		return;
	}

	updatePlayerDataInDb(player, message);

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
		.setTitle(player.name+" has "+n+" unit(s) with "+tprc+" relic(s)")
		.setDescription(lines).setColor(color)
		.setTimestamp(player.updated)
		.setFooter(config.footer.message, config.footer.iconUrl);
	message.channel.send(richMsg);
}

function showPlayerStats(player, message)
{
	if (!player.gp) {
		console.log(Date()+" - invalid GP for user:", player);
		return;
	}

	updatePlayerDataInDb(player, message);

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

function showWhoIs(user, nick, message)
{
	let lines = [
			"**"+nick+" ID is:** "+user.id,
			"**"+nick+" creation date is:**", " "+user.createdAt,
			"**"+nick+" presence status is:** "+user.presence.status
		];

	getPlayerFromDiscordId(user.id, message, function(player) {
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
}

function updatePlayerDataInDb(player, message, callback)
{
	let allycode = player.allycode;

	if (!player.gp) {
		console.log(Date()+" - invalid GP for user:", player);
		return;
	}

	// Try to find the same user in the database:
	getPlayerFromdatabase(allycode, message, function(oldPlVersion) {
		let lines = [];
		let msg = "";
		let sql = "INSERT INTO `evols` (allycode, unit_id, type, new_value) VALUES ?";

		// If the user was unknown, do no look for any evolution:
		if (oldPlVersion && oldPlVersion.gp) {
			// Check for evolutions:
			let newUnitCount = 0;
			let nbShips = 0;
			let oldCharsCount = oldPlVersion.unitsData.length;

			console.log(Date()+" - Old chars count:", oldCharsCount);
			player.unitsData.forEach(function(u) {
				let oldUnit = oldPlVersion.unitsData[u.name];

				msg = "Evolution: "+player.name;
				if (typeof(oldUnit)==="undefined") {
					if (u.combatType===1) {
						if (oldCharsCount) { // New character:
							msg += " unlocked "+u.name;
							console.log(Date()+" - "+msg);

							lines.push([allycode, u.name, "new", 1]);
						}
						++newUnitCount;
					} else ++nbShips;
					return;
				}

				if (u.gear > 11 && u.gear > oldUnit.gear) {
					msg += "'s "+u.name+" is now G"+u.gear;
					console.log(Date()+" - "+msg);

					// Add new evolution in the database ("evols" table):
					lines.push([allycode, u.name, "gear", u.gear]);
				}

				if (u.zetaCount > oldUnit.zetaCount) {
					msg += "'s "+u.name+" has now "+u.zetaCount+" zeta(s)";
					console.log(Date()+" - "+msg);

					// Add new evolution in the database ("evols" table):
					lines.push([allycode, u.name, "zeta", u.zetaCount]);
				}
			});
			if (newUnitCount) {
				console.log(Date()+" - There is %d new unit(s) in %s's roster.", newUnitCount, player.name);
			}
			console.log(Date()+" - %s owns %d ships", player.name, nbShips);

			msg = lines.length+" evolution(s) detected for: "+player.name;
			console.log(Date()+" - "+msg);
			if (lines.length) message.channel.send(msg);

			if (lines.length) {
				db_pool.query(sql, [lines], function(exc, result) {
					if (exc) {
						console.log("SQL:", sql);
						console.log(Date()+" - UC Exception:", exc.sqlMessage? exc.sqlMessage: exc);
						return;
					}

					console.log(Date()+" - %d evolution(s) inserted.", result.affectedRows);
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
				console.log(Date()+" - UC Exception:", exc.sqlMessage? exc.sqlMessage: exc);
				return;
			}

			console.log(Date()+" - %d user updated:", result.affectedRows, player.name);

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

					console.log(Date()+" - %d user inserted:", result.affectedRows, player.name);
				});
			}
		});

		if (player.unitsData && player.unitsData.length) {
			let lines = [];

			// See:
			// https://www.w3schools.com/nodejs/shownodejs_cmd.asp?filename=demo_db_insert_multiple
			sql = "REPLACE units (allycode, name, combatType, gear, gp, relic, zetaCount) VALUES ?";
			player.unitsData.forEach(function(u) { // u = current unit
				lines.push(
					[u.allycode, u.name, u.combatType, u.gear, u.gp, u.relic, u.zetaCount]
				);
			});

			db_pool.query(sql, [lines], function(exc, result) {
				if (exc) {
					console.log("SQL:", sql);
					console.log(Date()+" - RU Exception:", exc.sqlMessage? exc.sqlMessage: exc);
					return;
				}

				let nbr = result.affectedRows; // shortcut for number of records
				console.log(Date()+" - %d unit records updated (%d fresh units).", nbr, lines.length);

				if (typeof(callback)==="function") callback(player, message);
			});
		} else
				if (typeof(callback)==="function") callback(player, message);
	});
}

function ucfirst (str) {
  //  discuss at: https://locutus.io/php/ucfirst/
  // original by: Kevin van Zonneveld (https://kvz.io)
  // bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
  // improved by: Brett Zamir (https://brett-zamir.me)
  //   example 1: ucfirst('kevin van zonneveld')
  //   returns 1: 'Kevin van zonneveld'

  str += '';
  var f = str.charAt(0).toUpperCase();

  return f + str.substr(1);
}

// Main:
client.login(config.token);

// SQL query to request for orphelin players:
// SELECT * FROM `users` WHERE guildRefId NOT IN (SELECT swgoh_id FROM `guilds`)

// vim: noexpandtab shiftwidth=4 softtabstop=4 tabstop=4
