/** Juke's Discord bot for the SWGoH game */

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

console.log(Date()+" - Warming up...");

var db_con = mysql.createConnection({
  database: config.db.name,
  host:     config.db.host,
  password: config.db.pw,
  user:     config.db.user
});

// Connect to the database:
db_con.connect(function(exc) {
	if (exc) throw exc;

	console.log(Date()+" - Connected to the database.");

	function getPlayerFromDiscordId(discord_id, callback)
	{
		var sql = "SELECT * FROM users WHERE discord_id="+parseInt(discord_id);

		db_con.query(sql, function(exc, result) {
			if (exc) {
				console.log("SQL:", sql);
				console.log(Date()+" - Exception:", exc.sqlMessage? exc.sqlMessage: exc);
			} else {
				console.log(Date()+" - "+result.length+" record match(es) user's ID:", discord_id);
				// console.dir(result);
				if (result.length === 1) {
					console.log(Date()+" - Found allycode:", result[0].allycode);
					if (typeof(callback)==="function") callback(result[0]);
					return result[0].allycode;
				}
				console.log(Date()+" - Allycode not found!");
				if (typeof(callback)==="function") callback(null);
				return 0;
			}
		});
	}

	// Start listening:
	client.on("ready", () => {
		console.log(Date()+" - I am ready and listening.");
		client.user.username = config.username;
		client.user.setPresence({game: {name: config.prefix + "help", type: "listening"}});
	});

	// Check for input messages:
	client.on("message", (message) => {

		var allycode = 0;
		var arg = [];
		var command = "";
		var guild = null;
		var lines = [];
		var nick = {};
		var player = null;
		var richMsg = {};
		var sql = "";
		var user = message.author;

		// Filter with the prefix & ignore bots:
		if (message.author.bot
		|| (message.channel.type!=="dm" && !message.content.toLowerCase().startsWith(config.prefix))) {
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
						" aide, allycode (ac), dis, guildstats (gs), playerstats (ps), register (reg),"+
						" repete, selfy, start, status, whoami, whois",
						"**Commandes pour l'administrateur :** admin, stop, stoppe",
						"**NB :** en mp, le préfix est optionnel"
					]).setFooter(config.footer.message, config.footer.iconUrl);
				message.channel.send(richMsg);
				break;

			case "ac":
			case "allycode":
				let search = args.join(" ").replace("'", "");

				// Extract user's tag (if any):
				if (message.mentions && message.mentions.users && message.mentions.users.first()) {
					user = message.mentions.users.first();
					nick = user.username;
					search = nick;
				}

				sql = "SELECT * FROM users\n";
				sql+= " WHERE users.discord_name LIKE '%"+search+"%'\n";
				sql+= " OR    users.game_name    LIKE '%"+search+"%'";

				db_con.query(sql, function(exc, result) {
					if (exc) {
						console.log("SQL:", sql);
						console.log(Date()+" - Exception:", exc.sqlMessage? exc.sqlMessage: exc);
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
					client.destroy();
				}
				break;

			case "dis":
			case "repeat":
			case "repete":
			case "say":
				message.reply(args.join(" "));
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

						db_con.query(sql, function(exc, result) {
							if (exc) {
								console.log("SQL:", sql);
								let otd = exc.sqlMessage? exc.sqlMessage: exc;
								// otd = object to display
								console.log(Date()+" - Exception:", otd);
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
						" allycode (ac), guildstats (gs), help, playerstat (ps), repeat,"+
							" say, start, status, whoami, whois",
						"**Admin commands:** admin, destroy, leave,"+
							" register (reg), self, shutdown, stop",
						"**NB :** in DM, the prefix is optional"
					]).setFooter(config.footer.message, config.footer.iconUrl);
				message.channel.send(richMsg);
				break;

			case "pi":
			case "ps":
			case "stats":
			case "playerinfo":
			case "playerstat":
			case "playerstats":
				function showPlayerStats(allycode) {
					if (!allycode) {
						message.reply(":red_circle: Invalid or missing allycode! Try 'register' command.");
						return;
					}

					message.channel.send("Looking for "+allycode+"'s stats...");

					swgoh.getPlayerData(allycode, message, function(player) {
						if (!player.gp) {
							console.log(Date()+" - invalid player's GP:", player.gp);
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

						db_con.query(sql, function(exc, result) {
							if (exc) {
								console.log("SQL:", sql);
								console.log(Date()+" - Exception:", exc.sqlMessage? exc.sqlMessage: exc);
								return;
							}

							console.log(Date()+" - %d user updated.", result.affectedRows);

							if (!result.affectedRows) {
								sql = "INSERT INTO users\n"+
									"(allycode, game_name, gp, g12Count, g13Count, guildRefId, zetaCount)\n"+
									"VALUES ("+allycode+", "+mysql.escape(player.name)+
									", "+player.gp+", "+player.g12Count+", "+player.g13Count+
									", "+mysql.escape(player.guildRefId)+", "+player.zetaCount+")";

								db_con.query(sql, function(exc, result) {
									if (exc) {
										console.log("SQL:", sql);
										console.log(Date()+" - Exception:", exc.sqlMessage? exc.sqlMessage: exc);
										return;
									}

									console.log(Date()+" - %d user inserted.", result.affectedRows);
								});
							}

							if (player.unitsData && player.unitsData.length) {
								lines = [];

								sql = "REPLACE INTO units (allycode, name, combatType, gear, gp, relic, zetaCount) VALUES\n";
								player.unitsData.forEach(function(unit) {
									lines.push(
										"("+unit.allycode+", '"+unit.name+"', "+unit.combatType+", "+
										unit.gear+", "+unit.gp+", "+unit.relic+", "+unit.zetaCount+")"
									);
								});

								sql+= lines.join(",\n");
								db_con.query(sql.replace("\n", " "), function(exc, result) {
									if (exc) {
										console.log("SQL:", sql);
										console.log(Date()+" - Exception:", exc.sqlMessage? exc.sqlMessage: exc);
										return;
									}

									console.log(Date()+" - %d units updated.", result.affectedRows);
								});
							}
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
					showPlayerStats(allycode);
				} else {
					console.log(Date()+" - Try with user ID:", user.id);
					getPlayerFromDiscordId(user.id, function(player) {
						if (player) showPlayerStats(player.allycode);
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
				db_con.query(sql, function(exc, result) {
					if (exc) {
						console.log("SQL:", sql);
						if (exc.sqlMessage) {
							console.log(Date()+ " - Exception:", exc.sqlMessage);
							message.reply(":red_circle: Error: "+exc.sqlMessage);
						} else {
							console.log(Date()+" - Exception:", exc);
							message.reply(":red_circle: Error!");
						}
					} else {
						message.reply(":white_check_mark: Done.");
						console.log(Date()+" - %d user inserted.", result.affectedRows);

						if (!result.affectedRows) {
							sql = "UPDATE users"+
								" SET discord_id="+user.id+", discord_name="+mysql.escape(nick)+
								" WHERE allycode="+allycode;

							// Update an existing registration:
							db_con.query(sql, function(exc, result) {
								if (exc) {
									console.log("SQL:", sql);
									if (exc.sqlMessage) {
										console.log(Date()+ " - Exception:", exc.sqlMessage);
										message.reply(":red_circle: Error: "+exc.sqlMessage);
									} else {
										console.log(Date()+" - Exception:", exc);
										message.reply(":red_circle: Error!");
									}
								} else {
									message.reply(":white_check_mark: Done.");
									console.log(Date()+" - %d user updated.", result.affectedRows);
								}
							});
						}
					}
				});
				break;

			case "relics":
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

				sql = "SELECT * FROM units WHERE relic>0 AND";
				sql+= allycode? " allycode="+allycode:
					" allycode IN (SELECT allycode FROM users WHERE discord_id="+user.id+")";
				sql+= " ORDER BY relic DESC";

				db_con.query(sql, function(exc, result) {
					if (exc) {
						console.log("SQL:", sql);
						console.log(Date()+" - Exception:", exc.sqlMessage? exc.sqlMessage: exc);
						richMsg = new RichEmbed().setTitle("Error!").setColor("RED")
							.setDescription(["Failed to get player's units!"])
							.setFooter(config.footer.message, config.footer.iconUrl);
						message.channel.send(richMsg);
					} else {
						console.log(Date()+" - "+result.length+" unit(s) match(es):", allycode);
						// console.dir(result);
						if (result.length === 0) {
							let msg = "";

							console.log(Date()+" - You have no relic yet.");
							msg = "I don't know any relic in your roster for the moment.";
							msg+= " Try to refresh with the 'ps' command."
							message.channel.send(msg);
						} else {
							console.log(Date()+" - %d unit(s) with relic found.");

							result.forEach(function(unit) {
								lines.push(unit.relic+" relics on: "+unit.name);
							});
							richMsg = new RichEmbed().setTitle(nick+"'s relics").setColor("GREEN")
								.setDescription(lines)
								.setFooter(config.footer.message, config.footer.iconUrl);
							message.channel.send(richMsg);
						}
					}
				});
				break;

			case "start":
			case "status":
				message.channel.send("I am listening since: "+start);
				db_con.query("SELECT COUNT(*) AS nbu FROM users", function(exc, result) {
					if (exc) {
						console.log("SQL:", sql);
						console.log(Date()+" - Exception:", exc.sqlMessage? exc.sqlMessage: exc);
					} else {
						if (result.length === 1) {
							let nbu = result[0].nbu;
							console.log(Date()+" - %d users registered.", nbu);

							db_con.query("SELECT COUNT(*) AS nbg FROM guilds", function(exc, result) {
								if (exc) {
									console.log("SQL:", sql);
									console.log(Date()+" - Exception:", exc.sqlMessage? exc.sqlMessage: exc);
								} else {
									if (result.length === 1) {
										let msg = nbu+" users & "+result[0].nbg+" guild(s) registered.";
										console.log(Date()+" -", msg);
										message.channel.send(msg);
									}
								}
							});
						} else
							console.log(Date()+" - "+result.length+" result(s)!");
					}
				});
				break;

			case "self":
			case "selfy":
				user = client.user;
				nick = "My";

			case "whois":
				if (message.mentions && message.mentions.users && message.mentions.users.first()) {
					user = message.mentions.users.first();
					nick = user.username;
				} else if (command!=="self" && command!=="selfy"
						&& message.mentions && message.mentions.users) {
					message.reply("Cannot answer for the moment.");

					console.log(Date()+" - Mentions:");
					console.dir(message.mentions.users);

					return;
				} else if (command!=="self" && command!=="selfy") {
					message.reply("No user specified!");
					return;
				}

			case "whoami":
				nick = (nick==="My")? nick: (nick+"'s");
				lines = [
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
						.setColor("GREEN")
						.setTitle("User information")
						.setThumbnail(user.displayAvatarURL)
						.setDescription(lines)
						.setFooter(config.footer.message, config.footer.iconUrl);
					message.channel.send(richMsg);
				});
				break;

			default:
				message.reply("I don't get it. :thinking:");
				console.log(Date()+" - Unknown command was: "+command);
		}
	});

	client.login(config.token);
});

// vim: noexpandtab shiftwidth=4 softtabstop=4 tabstop=4
