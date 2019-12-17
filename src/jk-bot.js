/**
 * jk-bot.js is the main file for Juke's Discord bot for the SWGoH game
 * @author PixEye@pixeye.net
 * @since  2019-10-29
 */

// jshint esversion: 8

// Extract the required classes from the discord.js module:
const { Client, RichEmbed } = require("discord.js");

// Create an instance of a Discord client:
const client = new Client();

// Get the configuration from a separated JSON file:
const config = require("./config.json");

// Remember when this program started:
const start = Date();

// Database connection:
const mysql = require("mysql");

// Load my other modules:
const swgoh = require("./swgoh"); // SWGoH API
const tools = require("./tools"); // My functions

// Prepare DB connection pool:
const db_pool = mysql.createPool({
	connectionLimit: config.db.conMaxCount,
	database       : config.db.name,
	host           : config.db.host,
	password       : config.db.pw,
	user           : config.db.user
});

// Shortcut(s):
let logPrefix = tools.logPrefix;

console.log(logPrefix()+"Loading...");

// Start listening:
client.on("ready", () => {
	console.log(logPrefix()+"I am ready and listening.");
	client.user.username = config.discord.username;
	client.user.setPresence({game: {name: config.discord.prefix + "help", type: "listening"}});
});

// Get errors (if any):
client.on("error", (exc) => {
	console.log(logPrefix()+"Client exception!\n %s: %s", exc.type, exc.message? exc.message: exc);
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
		(message.channel.type!=="dm" && !message.content.toLowerCase().startsWith(config.discord.prefix))) {
		return; // stop parsing the message
	}

	if (message.channel.type==="dm") {
		args = message.content.trim().replace(config.discord.prefix, "").trim().split(/ +/g);
	} else {
		args = message.content.slice(config.discord.prefix.length).trim().split(/ +/g);
	}
	command = args.shift().toLowerCase();
	nick = user.username;

	console.log(logPrefix()+"/ \""+user.username+"\" sent command: "+message.content);

	// public commands:
	switch (command) {
		case "about":
			lines.push("This bot is written by <@222443133294739456> (aka PixEye).");
			lines.push("Report him any bug or enhancement request.");
			lines.push("");
			lines.push("This instance of the bot is owned by <@"+config.discord.ownerID+">.");
			richMsg = new RichEmbed().setTitle("About the author").setColor("GREEN")
				.setDescription(lines).setTimestamp(message.createdTimestamp)
				.setFooter(config.footer.message, config.footer.iconUrl);
			message.channel.send(richMsg);
			break;

		case "admin":
			if(message.author.id !== config.discord.ownerID) {
				message.reply("You're not my master! :imp:");
			} else {
				message.reply("Yes master?");
			}
			break;

		case "aide":
			richMsg = new RichEmbed().setTitle("Liste des commandes")
				.setDescription([
					"**Commandes utilisateur :**",
					" aide, allycode (ac), auteur, charInfo (ci), checkMods (cm), checkUnitsGp (cugp)"+
					", dis, getUnregisteredPlayers (gup), guildStats (gs), help, invite"+
					", (last)evols (le), playerStats (ps), register (reg), relics"+
					", repete, self(y), shipInfo (si), start, stats, status, whoami, whois",
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
					console.log(logPrefix()+"AC Exception:", exc.sqlMessage? exc.sqlMessage: exc);
				} else {
					console.log(logPrefix()+""+result.length+" record(s) match(es):", search);
					// console.dir(result);
					if (result.length !== 1) {
						console.log(logPrefix()+"%d result(s) match allycode: %s", result.length, allycode);
						message.channel.send(result.length+" match(es)! Please be more specific.");
					} else {
						user = result[0];
						console.log(logPrefix()+"%s's allycode is:", user.discord_name, user.allycode);
						message.channel.send(user.discord_name+"'s allycode is: "+user.allycode);
					}
				}
			});
			break;

		case "auteur":
			lines.push("Ce bot a été écrit par <@222443133294739456> (aka PixEye).");
			lines.push("En cas de bug ou de demande d'amélioration, contactez-le.");
			lines.push("");
			lines.push("Cette instance du bot appartient à <@"+config.discord.ownerID+">.");
			richMsg = new RichEmbed().setTitle("A propos de l'auteur").setColor("GREEN")
				.setDescription(lines).setTimestamp(message.createdTimestamp)
				.setFooter(config.footer.message, config.footer.iconUrl);
			message.channel.send(richMsg);
			break;

		case "ci":
		case "charinfo":
		case "characterinfo":
			// Extract user's tag (if any):
			if (message.mentions && message.mentions.users && message.mentions.users.first()) {
				user = message.mentions.users.first();
				nick = user.username;
			}

			allycode = tools.getFirstAllycodeInWords(args);

			// Look for a character name:
			args.forEach(function(word) {
				// ignore tags/mentions & allycodes:
				if (word.indexOf("<")<0 && word.match(/[a-z]/i)) {
					msg+= " "+tools.ucfirst(word);
				}
			});

			if (!msg) {
				console.warn(logPrefix()+"No character name found in the message!" );
				message.reply("No character name found in your message!");
				return;
			}

			msg = msg.trim();
			console.log(logPrefix()+"Character to look for is:", msg);
			if (allycode) {
				tools.getPlayerStats(allycode, message, function(player, message) {
					return tools.showUnitInfo(player, message, msg, 1);
				});
			} else {
				console.log(logPrefix()+"Try with user ID:", user.id);
				tools.getPlayerFromDiscordId(user.id, message, function(player) {
					if (player) tools.getPlayerStats(player.allycode, message, function(player, message) {
						return tools.showUnitInfo(player, message, msg, 1);
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
			allycode = tools.getFirstAllycodeInWords(args);
			if (allycode) {
				tools.getPlayerStats(allycode, message, function(player, message) {
					return tools.checkUnitsGp(player, message, limit);
				});
			} else {
				console.log(logPrefix()+"Try with user ID:", user.id);
				tools.getPlayerFromDiscordId(user.id, message, function(player) {
					if (player) {
						tools.getPlayerStats(player.allycode, message, function(player, message) {
							return tools.checkUnitsGp(player, message, limit);
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

			allycode = tools.getFirstAllycodeInWords(args);
			if (allycode) {
				tools.getPlayerStats(allycode, message, tools.checkPlayerMods);
			} else {
				console.log(logPrefix()+"Try with user ID:", user.id);
				tools.getPlayerFromDiscordId(user.id, message, function(player) {
					if (player) tools.getPlayerStats(player.allycode, message, tools.checkPlayerMods);
				});
			}
			break;

		case "licence":
		case "license":
			lines.push("This free software is published under the Apache License 2.0");
			lines.push("http://www.apache.org/licenses/LICENSE-2.0");
			richMsg = new RichEmbed().setTitle("License").setColor("GREEN")
				.setDescription(lines).setTimestamp(message.createdTimestamp)
				.setFooter(config.footer.message, config.footer.iconUrl);
			message.channel.send(richMsg);
			break;

		case "destroy":
		case "leave":
		case "stutdown":
		case "stop":
		case "stoppe":
			if(message.author.id !== config.discord.ownerID) {
				message.reply("You're not my master! :imp:");
			} else {
				message.reply("Up to your will master. Leaving...");
				console.log(logPrefix()+"Stopping!");

				db_pool.end(function(exc) {
					console.log(logPrefix()+"DB connection stopped.");
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

			allycode = tools.getFirstAllycodeInWords(args);
			if (allycode) {
				tools.getGuildStats(allycode, message);
			} else {
				console.log(logPrefix()+"Try with user ID:", user.id);
				tools.getPlayerFromDiscordId(user.id, message, function(player) {
					if (player) tools.getGuildStats(player.allycode, message);
				});
			}
			break;

		case "gps":
		case "guildPlayerStat":
		case "guildPlayerStats":
			// Extract user's tag (if any):
			if (message.mentions && message.mentions.users && message.mentions.users.first()) {
				user = message.mentions.users.first();
				nick = user.username;
			}

			allycode = tools.getFirstAllycodeInWords(args);
			if (allycode) {
				tools.guildPlayerStats(allycode, message);
			} else {
				console.log(logPrefix()+"Try with user ID:", user.id);
				tools.getPlayerFromDiscordId(user.id, message, function(player) {
					if (player) tools.guildPlayerStats(player.allycode, message);
				});
			}
			break;

		case "gu":
		case "gup":
		case "getunregistered":
		case "getunregplayers":
		case "getunregisteredplayers":
			// Extract user's tag (if any):
			if (message.mentions && message.mentions.users && message.mentions.users.first()) {
				user = message.mentions.users.first();
				nick = user.username;
			}

			allycode = tools.getFirstAllycodeInWords(args);
			if (allycode) {
				tools.getUnregPlayers(allycode, message);
			} else {
				console.log(logPrefix()+"Try with user ID:", user.id);
				tools.getPlayerFromDiscordId(user.id, message, function(player) {
					if (player) tools.getUnregPlayers(player.allycode, message);
				});
			}
			break;

		case "help":
			richMsg = new RichEmbed().setTitle("Avialable commands")
				.setDescription([
					"**User commands:**",
					" about, aide, allycode (ac), charInfo (ci), checkMods (cm), checkUnitsGp (cugp)"+
					", getUnregisteredPlayers (gup), guildStats (gs), help, invite, (last)evols (le)"+
					", playerStat (ps), register (reg), relics, repeat, say"+
					", self(y), shipInfo (si), start, stats, status, whoami, whois",
					"**Admin commands:** admin, destroy/leave/shutdown/stop, query/req(uest)",
					"**NB:** in DM, the prefix is optional."])
				.setTimestamp(message.createdTimestamp)
				.setFooter(config.footer.message, config.footer.iconUrl);
			message.channel.send(richMsg);
			break;

		case "invite":
			// https://discordapp.com/api/oauth2/authorize?client_id=629346604075450399&permissions=2112&scope=bot
			lines.push("Follow this link to invite me to your server(s): http://bit.ly/JukeSwgohBot");
			richMsg = new RichEmbed().setTitle("Invite").setColor("GREEN")
				.setDescription(lines).setTimestamp(message.createdTimestamp)
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

			allycode = tools.getFirstAllycodeInWords(args);
			if (allycode) {
				tools.getPlayerStats(allycode, message, tools.getLastEvols);
			} else {
				console.log(logPrefix()+"Try with user ID:", user.id);
				tools.getPlayerFromDiscordId(user.id, message, function(player) {
					if (player) tools.getPlayerStats(player.allycode, message, tools.getLastEvols);
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

			allycode = tools.getFirstAllycodeInWords(args);
			if (allycode) {
				tools.getPlayerStats(allycode, message, tools.showPlayerStats);
			} else {
				console.log(logPrefix()+"Try with user ID:", user.id);
				tools.getPlayerFromDiscordId(user.id, message, function(player) {
					if (player) tools.getPlayerStats(player.allycode, message, tools.showPlayerStats);
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

			allycode = tools.getFirstAllycodeInWords(args);
			if (!allycode) {
				message.reply(":warning: Allycode is invalid or missing!");
				return;
			}

			sql = "INSERT INTO `users` (discord_id, discord_name, allycode)"+
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
						console.log(logPrefix()+"IU2 Exception:", exc);
						message.reply(":red_circle: Error!");
						return;
					}
				}

				if (result.affectedRows) {
					message.reply(":white_check_mark: Done.");
					console.log(logPrefix()+"%d user inserted:", result.affectedRows, nick);
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
							console.log(logPrefix()+"UU2 Exception:", exc);
							message.reply(":red_circle: Error!");
						}
					} else {
						message.reply(":white_check_mark: Done.");
						console.log(logPrefix()+"%d user updated:", result.affectedRows, nick);
					}
				});
			});
			break;

		case "si":
		case "shipinfo":
			// Extract user's tag (if any):
			if (message.mentions && message.mentions.users && message.mentions.users.first()) {
				user = message.mentions.users.first();
				nick = user.username;
			}

			allycode = tools.getFirstAllycodeInWords(args);

			// Look for a ship name:
			args.forEach(function(word) {
				// ignore tags/mentions & allycodes:
				if (word.indexOf("<")<0 && word.match(/[a-z]/i)) {
					msg+= " "+tools.ucfirst(word);
				}
			});

			if (!msg) {
				console.warn(logPrefix()+"No ship name found in the message!" );
				message.reply("No ship name found in your message!");
				return;
			}

			msg = msg.trim();
			console.log(logPrefix()+"Ship to look for is:", msg);
			if (allycode) {
				tools.getPlayerStats(allycode, message, function(player, message) {
					return tools.showUnitInfo(player, message, msg, 2);
				});
			} else {
				console.log(logPrefix()+"Try with user ID:", user.id);
				tools.getPlayerFromDiscordId(user.id, message, function(player) {
					if (player) tools.getPlayerStats(player.allycode, message, function(player, message) {
						return tools.showUnitInfo(player, message, msg, 2);
					});
				});
			}
			break;

		case "tc":
		case "rel":
		case "relic":
		case "relics":
		case "topchar":
		case "topchars":
			// Extract user's tag (if any):
			if (message.mentions && message.mentions.users && message.mentions.users.first()) {
				user = message.mentions.users.first();
				nick = user.username;
			}

			allycode = tools.getFirstAllycodeInWords(args);
			if (allycode) {
				tools.getPlayerStats(allycode, message, tools.showPlayerRelics);
			} else {
				console.log(logPrefix()+"Try with user ID:", user.id);
				tools.getPlayerFromDiscordId(user.id, message, function(player) {
					if (player) tools.getPlayerStats(player.allycode, message, tools.showPlayerRelics);
				});
			}
			break;

		case "req":
		case "sql":
		case "query":
		case "request":
			if(message.author.id !== config.discord.ownerID) {
				message.reply("You're not my master! :imp:");
				return;
			}

			sql = args.join(" ");
			db_pool.query(sql, function(exc, result) {
				let col = "ORANGE";

				if (exc) {
					console.log("SQL:", sql);
					console.log(logPrefix()+"RQ Exception:", exc.sqlMessage? exc.sqlMessage: exc.code);

					col = "RED";
					lines = [exc.sqlMessage? exc.sqlMessage: exc.code];
				} else {
					console.log(logPrefix()+"%d record(s) in the result", result.length);

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
				let maxLines = 10;
				let tpc = 0; // total player count

				if (exc) {
					console.log("SQL:", sql);
					console.log(logPrefix()+"MS Exception:", exc.sqlMessage? exc.sqlMessage: exc.code);
					return;
				}

				console.log(logPrefix()+"%d guilds in the result", result.length);

				if (result.length) {
					lines.push("");
					result.forEach(function(record, i) {
						tpc+= record.cnt;

						if (i<maxLines)
							lines.push(record.cnt+" player(s) in: "+record.name);
						else if (i===maxLines)
							lines.push("And "+(result.length - i)+" more...");
					});
				}
				console.log(logPrefix()+"%d guilds & %d users in the result", result.length, tpc);
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
					console.log(logPrefix()+"ST1 Exception:", exc.sqlMessage? exc.sqlMessage: exc);
					message.reply("Exception: failed to count registered guilds!");
					return;
				}

				if (result.length !== 1) {
					console.log(logPrefix()+""+result.length+" result(s) to count guilds!");
					message.reply("Failed to count registered guilds!");
					return;
				}

				nbg = result[0].nbg; // nbg = number of guilds
				console.log(logPrefix()+"%d guild(s) registered.", nbg);

				sql = "SELECT COUNT(`id`) AS nbp FROM `users`"; // nbp = number of players
				db_pool.query(sql, countPlayers);
			}

			function countPlayers(exc, result) {
				if (exc) {
					console.log("SQL:", sql);
					console.log(logPrefix()+"ST2 Exception:", exc.sqlMessage? exc.sqlMessage: exc.code);
					message.reply("Exception: failed to count registered players!");
					return;
				}

				if (result.length !== 1) {
					console.log(logPrefix()+""+result.length+" result(s) to count users!");
					message.reply("Failed to count registered users!");
					return;
				}

				nbp = result[0].nbp; // nbp = number of players
				let avg = nbg? Math.round(nbp/nbg): nbp; // average per guild
				console.log(logPrefix()+"%d user(s) registered (~%d per guild).", nbp, avg);

				sql = "SELECT COUNT(`id`) AS nbu FROM `units`"; // nbp = number of units
				db_pool.query(sql, countUnits);
			}

			function countUnits(exc, result) {
				if (exc) {
					console.log("SQL:", sql);
					console.log(logPrefix()+"ST3 Exception:", exc.sqlMessage? exc.sqlMessage: exc.code);
					message.reply("Exception: failed to count registered players!");
					return;
				}

				if (result.length !== 1) {
					console.log(logPrefix()+""+result.length+" result(s) to count users!");
					message.reply("Failed to count registered units!");
					return;
				}

				let nbu = result[0].nbu; // nbu = number of units
				let avg = nbp? Math.round(nbu/nbp): nbu; // average per player
				console.log(logPrefix()+"%d unit(s) registered (~%d per user).", nbu, avg);

				message.channel.send(nbg+" guilds, "+nbp+" players & "+nbu+" unit(s) registered.");
			}
			break;

		case "self":
		case "selfy":
			user = client.user;
			nick = "My";
			tools.showWhoIs(user, nick, message);
			break;

		case "whois":
			if (message.mentions && message.mentions.users && message.mentions.users.first()) {
				user = message.mentions.users.first();
				nick = user.username;
			} else
			if (command!=="self" && command!=="selfy" && message.mentions && message.mentions.users) {
				message.reply("Cannot answer for the moment.");

				console.log(logPrefix()+"Mentions:");
				console.dir(message.mentions.users);

				return;
			} else if (command!=="self" && command!=="selfy") {
				message.reply("No user specified!");
				return;
			}
			tools.showWhoIs(user, nick, message);
			break;

		case "whoami":
			nick = (nick==="My")? nick: (nick+"'s");
			tools.showWhoIs(user, nick, message);
			break;

		default:
			message.reply("I don't get it. :thinking:");
			console.log(logPrefix()+"Unknown command was: "+command);
	}
});

// Main:
client.login(config.discord.token);

// SQL query to request for orphelin players:
// SELECT * FROM `users` WHERE guildRefId NOT IN (SELECT swgoh_id FROM `guilds`)

// vim: noexpandtab shiftwidth=4 softtabstop=4 tabstop=4
