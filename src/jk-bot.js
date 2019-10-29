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

	function getAllycodeFromDiscordId(discord_id, callback)
	{
		var sql = "SELECT * FROM users WHERE discord_id="+parseInt(discord_id);

		db_con.query(sql, function (exc, result) {
			if (exc) {
				console.log("SQL:", sql);
				console.log(Date()+" - Exception:", exc.sqlMessage? exc.sqlMessage: exc);
			} else {
				console.log(Date()+" - "+result.length+" record matche(s) user's ID:", discord_id);
				// console.dir(result);
				if (result.length === 1) {
					console.log(Date()+" - Found allycode:", result[0].allycode);
					if (typeof(callback)==="function") callback(result[0].allycode);
					return result[0].allycode;
				}
				console.log(Date()+" - Allycode not found!");
				if (typeof(callback)==="function") callback(0);
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

		console.log(Date()+" - \""+user.username+"\" sent command: "+message.content);

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
						" aide, dis, guildstats (gs), playerstats (ps), register (reg),"+
						" repete, selfy, start, status, whoami, whois",
						"**Commandes pour l'administrateur :** admin, stop, stoppe",
						"**NB :** en mp, le préfix est optionnel"
					]).setFooter(config.footer.message, config.footer.iconUrl);
				message.channel.send(richMsg);
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
					if (allycode) {
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

							db_con.query(sql, function (exc, result) {
								if (exc) {
									console.log("SQL:", sql);
									console.log(
										Date()+" - Exception:", exc.sqlMessage? exc.sqlMessage: exc);
									return;
								}

								console.log(Date()+" - %d guild record updated.", result.affectedRows);
							});
						});
					} else
						message.reply(":red_circle: Invalid or missing allycode!");
				}

				// Extract user's tag (if any):
				if (message.mentions && message.mentions.users && message.mentions.users.first()) {
					user = message.mentions.users.first();
					nick = user.username;
				}

				if (arg.join("").trim().length>0) {
					// Try to find an ally code in the args:
					args.forEach(function(arg) {
						if (arg.indexOf('<')<0) { // ignore tags
							allycode = parseInt(arg.replace(/[^0-9]/g, ""));
							console.log(Date()+" - Found allycode:", allycode);
						}
					});
					showGuildStats(allycode);
				} else {
					console.log(Date()+" - Try with user ID:", user.id);
					getAllycodeFromDiscordId(user.id, function(allycode) {
						showGuildStats(allycode);
					});
				}
				break;

			case "help":
				richMsg = new RichEmbed().setTitle("Help")
					.setDescription([
						"**Here is a quick list of user commands (without explanation):**",
						" guildstats (gs), help, playerstat (ps), repeat,"+
							" say, start, status, whoami, whois",
						"**Admin commands:** admin, destroy, leave,"+
							" register (reg), self, shutdown, stop",
						"**NB :** in DM, the prefix is optional"
					]).setFooter(config.footer.message, config.footer.iconUrl);
				message.channel.send(richMsg);
				break;

			case "ps":
			case "stats":
			case "playerinfo":
			case "playerstat":
			case "playerstats":
				function showPlayerStats(allycode) {
					if (allycode) {
						message.channel.send("Looking for "+allycode+"'s stats...");

						swgoh.getPlayerData(allycode, message, function(player) {
							if (!player.gp) {
								console.log(Date()+" - invalid player GP:", player.gp);
								return;
							}

							// Remember user's stats:
							sql = "UPDATE users SET"+
								" gp="+player.gp+","+
								" g12Count="+player.g12Count+","+
								" g13Count="+player.g13Count+","+
								" guildRefId="+mysql.escape(player.guildRefId)+","+
								" zetaCount="+player.zetaCount+" "+
								"WHERE allycode="+allycode;
							db_con.query(sql, function (exc, result) {
								if (exc) {
									console.log("SQL:", sql);
									console.log(
										Date()+" - Exception:", exc.sqlMessage? exc.sqlMessage: exc);
									return;
								}

								console.log(Date()+" - %d player record updated.", result.affectedRows);
							});
						});
					} else
						message.reply(
							":red_circle: Invalid or missing allycode! Try 'register' command.");
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
					getAllycodeFromDiscordId(user.id, function(allycode) {
						showPlayerStats(allycode);
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

				sql = "INSERT INTO users (discord_id, discord_nickname, allycode)"+
					" VALUES ("+user.id+', '+mysql.escape(nick)+', '+allycode+")";

				// Register:
				db_con.query(sql, function (exc, result) {
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
						console.log(Date()+" - 1 record inserted.");
					}
				});
				break;

			case "start":
			case "status":
				message.channel.send("I am listening since: "+start);
				db_con.query("SELECT COUNT(*) AS cnt FROM users", function (exc, result) {
					if (exc) {
						console.log("SQL:", sql);
						console.log(Date()+" - Exception:", exc.sqlMessage? exc.sqlMessage: exc);
					} else {
						if (result.length === 1) {
							console.log(Date()+" - %d users registered.", result[0].cnt);
							message.channel.send(result[0].cnt+" users registered.");
						}
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

				getAllycodeFromDiscordId(user.id, function(allycode) {
					if (allycode) {
						lines.push("**"+nick+" allycode is:** "+allycode);
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
