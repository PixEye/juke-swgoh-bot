/**
 * jk-bot.js is the main file of Juke's Discord Bot about the mobile game: Star Wars Galaxy of Heroes
 * @author PixEye@pixeye.net
 * @since  2019-10-29
 */

// jshint esversion: 8

// Remember when this program started:
const start = new Date;

// Extract the required classes from the discord.js module:
const { Client, RichEmbed } = require("discord.js");

// Create an instance of a Discord client:
const client = new Client();

// Database connection:
const mysql = require("mysql");

// Load other modules:
const locutus   = require("./locutus"); // Functions from locutus.io
//nst swgohApi  = require("./swgoh");  // SWGoH API of this bot
const tools     = require("./tools"); // Several functions
//nst gacTools  = require("./gac_tools"); // GAC tracker related functions
const msg_fr_FR = require("../data/messages-fr_FR"); // French translations
const view      = require("./view"); // Functions used to display results

// Get the configuration & its template from separated JSON files:
let config = require("./config.json");
let tplCfg = require("./config-template.json");

// Prepare DB connection pool:
let db_pool = mysql.createPool({
	"connectionLimit": config.db.conMaxCount,
	"database"       : config.db.name,
	"host"           : config.db.host,
	"password"       : config.db.pass,
	"user"           : config.db.user
});

// Shortcut(s):
let logPrefix = tools.logPrefix;

console.log(logPrefix()+"Loading...");
console.log(logPrefix()+"Test cleanAc(): "+tools.cleanAc(123456789));

// Check config:
try {
	checkConfig();
} catch(exc) {
	console.warn("Configuration check:");
	console.warn(exc);
	console.warn("Compare 'config-template.json' & 'config.json' to find the mistake.");
	throw exc; // Stop here
}

let botMsgCount = 0;
let cmdCount = 0;
let failure_since = 0;
let listen_since = new Date;
let msgCount = 0;

let down_time = listen_since - start;

// Run the periodical process:
tools.periodicalProcess(true); // true to identify the first time
const timer = setInterval(tools.periodicalProcess, 31000); // 31'000 ms = 31s */

// Start listening:
client.on("ready", () => {
	listen_since = new Date;
	if (failure_since) down_time += listen_since - failure_since;
	failure_since = 0;

	console.log(logPrefix()+"I am ready and listening.");
	console.log(logPrefix()+"Down time in minutes: "+Math.round(down_time/1000/60));

	client.user.username = config.discord.username;
	client.user.setPresence({"game": {"type": "listening", "name": "help (in DM)"}});
	tools.loadUnitNames();
});

// Get errors (if any):
client.on("error", (exc) => {
	if (!failure_since) failure_since = new Date;
	console.log(logPrefix()+"Client exception!\n %s: %s", exc.type, exc.message? exc.message: exc);
});

// Check for input messages:
client.on("message", (message) => {
	const prefix = config.discord.prefix;
	const prefixRegExp = new RegExp("^"+prefix, "i");

	var allycode = 0;
	var cmd = "";
	var command = "";
	var delta = 0;
	var lines = [];
	var nick = "";
	let player = {};
	var readCommands = ['behave', 'get', 'get'+'rank', 'get'+'score', 'rank', 'top', 'worst'];
	var richMsg = {};
	let s = "";
	let search = "";
	let searchStr = "";
	var sql = "";
	var user = message.author;
	var words = message.content.trim().split(/ +/g);

	// First filter is to ignore bots (including self authored messages):
	if (user.bot) {
		++ botMsgCount;
		return; // do not parse any bot message: stop here
	}

	++ msgCount;

	if (message.channel.type==="dm") { // private message to the bot
		words = message.content.trim().replace(prefixRegExp, "");
	} else // message with bot's tag:
	if (words && words.length && words[0].startsWith('<@') && words[0].endsWith(config.discord.selfId+'>')) {
		words.shift(); // forget first word (self bot tag)
		words = words.join(' ').trim().replace(prefixRegExp, "");
	} else
	if (message.content && message.content.toLowerCase().startsWith(prefix)) { // message with bot prefix
		words = message.content.slice(prefix.length);
	} else {
		return;
	}

	++ cmdCount;
	words = words.trim().split(/ +/g);
	command = words.shift().toLowerCase();
	nick = locutus.utf8_decode(user.username);
	const wc = words.length; // word count
	let addon = wc? ": "+JSON.stringify(words): "";

	s = wc>1? 's': '';
	console.log(logPrefix()+'/ "'+nick+'" used command "'+command+'" with '+wc+" arg"+s+addon);

	search = words.join(" ").replace("'", "");
	searchStr = "p.discord_name LIKE '%"+search+"%' OR p.game_name LIKE '%"+search+"%'";

	if (!wc) {
		search = user.id;
		searchStr = "p.discord_id="+search;
	} else {
		// Extract user's tag (if any):
		// user = message.mentions.users.first();
		console.log(logPrefix()+"Parsing "+wc+" word"+s+"...");
		words.forEach(word => {
			try {
				user = getUserFromMention(word, message);
				// console.log(logPrefix()+"Found user in: "+word);
			} catch(err) {
				if (err !== 'No mention found') console.warn(err);
				return;
			}

			nick = locutus.utf8_decode(user.username);
			search = user.id;
			searchStr = "p.discord_id="+search;
			console.log(logPrefix()+"Found mention "+word+" about uid: "+search);
		});
	}
	allycode = tools.getFirstAllycodeInWords(words);
	player = {"allycode": allycode, "discord_name": nick};
	message.words = words; // save what we just computed

	// public commands:
	switch (command) {
		case "about":
			lines.push("This bot is written by <@222443133294739456> (aka PixEye).");
			lines.push("Report him any bug or enhancement request.");
			lines.push("");
			lines.push("This instance of the bot is owned by <@"+config.discord.ownerID+">.");
			richMsg = new RichEmbed().setTitle("About the author").setColor("GREEN")
				.setDescription(lines).setTimestamp()
				.setFooter(config.footer.message, config.footer.iconUrl);
			message.channel.send(richMsg);
			break;

		case "abbr":
		case "abbreviation":
		case "abbreviations":
		case "acronym":
		case "acronyms":
			view.showAbbr(message);
			break;

		case "admin":
			if (message.author.id !== config.discord.ownerID) {
				message.reply("You're not my master! :imp:");
			} else {
				message.reply("Yes master?");
			}
			break;

		case "aide":
			richMsg = new RichEmbed()
				.setTitle(msg_fr_FR.commandList)
				.setDescription(msg_fr_FR.helpContent)
				.setTimestamp()
				.setFooter(config.footer.message, config.footer.iconUrl);
			message.channel.send(richMsg);
			break;

		case "ac":
		case "allycode":
			sql = "SELECT p.* FROM `users` p"+
				// " LEFT JOIN `guilds` g ON p.guildRefId=g.swgoh_id"+
				" WHERE "+searchStr; // +" ORDER BY RAND() LIMIT 10";

			db_pool.query(sql, (exc, users) => {
				let guildIds = {};
				let msg = "";

				if (exc) {
					console.log("SQL:", sql);
					console.log(logPrefix()+"AC Exception:", exc.sqlMessage? exc.sqlMessage: exc);
					return;
				}

				console.log(logPrefix()+users.length+" record(s) match(es):", search);
				// console.dir(users);
				if (users.length <= 0) {
					console.log(sql);

					msg = "No match found!";
					console.log(logPrefix()+msg);
					message.reply(msg);
				} else { // 1 or more results:
					if (users.length>1) lines.push("There are "+users.length+" total matches:");

					users.forEach(user => {
						if (user.guildRefId) {
							guildIds[user.guildRefId] = user.guildRefId;
						}
					});

					if (users.length>10) {
						lines = ['Here are 10 random matches out of '+users.length+':'];
						users.sort(function () { return 0.5 - Math.random() }); // pseudo shuffle
						users = users.slice(0, 9);
					}

					sql = "SELECT * from `guilds` WHERE swgoh_id IN (?)";
					guildIds = Object.keys(guildIds); // convert object to array
					if (!guildIds.length) {
						guildIds = ['G1582274835']; // FF ID
					}
					db_pool.query(sql, [guildIds], (exc, dbGuilds) => {
						let guildDescr = {};

						if (exc) {
							console.log("SQL:", sql);
							console.log(logPrefix()+"AC Exception:", exc.sqlMessage? exc.sqlMessage: exc);
							return;
						}

						dbGuilds.forEach(guild => {
							guildDescr[guild.swgoh_id] = guild.name.trim();
							if (guild.memberCount) {
								guildDescr[guild.swgoh_id]+= ': '+guild.memberCount+' members';
							}
							if (guild.gp) {
								guild.gp = Math.round(guild.gp / 1e6); // to M
								guildDescr[guild.swgoh_id]+= ', GP: '+guild.gp+'M';
							}
						});

						users.forEach(user => {
							let gpm = Math.round(user.gp / 1e5) / 10;
							let msg = " is ";

							if (user.banned) msg += "[ProXima :no_entry: banned] ";
							msg += user.game_name+"'s code ("+gpm+"M";
							if (user.guildRefId && typeof(guildDescr[user.guildRefId])==='string') {
								msg+= " from guild "+guildDescr[user.guildRefId];
							}
							msg += ")";
							lines.push("`"+tools.cleanAc(user.allycode)+"`"+msg);
							console.log(logPrefix()+tools.cleanAc(user.allycode)+msg);
						});
						message.channel.send(lines);
					});
				}
			});
			break;

		case msg_fr_FR.author:
		case msg_fr_FR.problem:
			lines.push(msg_fr_FR.botWrittenBy+" <@222443133294739456> (aka PixEye).");
			lines.push(msg_fr_FR.inCaseOfTrouble);
			lines.push("");
			lines.push(msg_fr_FR.thisBotInstanceBelongsTo+" <@"+config.discord.ownerID+">.");
			richMsg = new RichEmbed().setTitle(msg_fr_FR.aboutTheAuthor).setColor("GREEN")
				.setDescription(lines).setTimestamp()
				.setFooter(config.footer.message, config.footer.iconUrl);
			message.channel.send(richMsg);
			break;

		case "author":
		case "bug":
		case "problem":
			lines.push("This bot was written by <@222443133294739456> (aka PixEye).");
			lines.push("In case of bug or enhancement request, please open a github ticket.");
			lines.push("");
			lines.push("This instance of the bot belongs to <@"+config.discord.ownerID+">.");
			richMsg = new RichEmbed().setTitle("About the author").setColor("GREEN")
				.setDescription(lines).setTimestamp()
				.setFooter(config.footer.message, config.footer.iconUrl);
			message.channel.send(richMsg);
			break;

		// case "ban": // TODO
		case "ban"+"list":
		case "bl":
			sql = "SELECT p.* FROM `users` p WHERE banned ORDER BY game_name";

			db_pool.query(sql, (exc, users) => {
				let msg = "";

				if (exc) {
					console.log("SQL:", sql);
					console.log(logPrefix()+"AC Exception:", exc.sqlMessage? exc.sqlMessage: exc);
					return;
				}

				console.log(logPrefix()+'Found %d banned users', users.length);
				// console.dir(users);
				if (users.length <= 0) {
					console.log(sql);

					msg = "No match found!";
					console.log(logPrefix()+msg);
					message.reply(msg);
				} else { // 1 or more results:
					// lines.push("There are "+users.length+" matches:");
					users.forEach(user => {
						lines.push('**'+user.game_name+'** ('+tools.cleanAc(user.allycode)+')');
					});
					msg = lines.length+' banned players: '+lines.join(', ')+'.';
					message.channel.send(msg);
				}
			});
			break;

		case "behave": // same as behave worst
		case "behave"+"add":
		case "behave"+"get":
		case "behave"+"rank":
		case "behave"+"rem":
		case "behave"+"remove":
		case "behave"+"set":
		case "behave"+"worst":
		case "behaviour": // same as behaviour worst
		case "behaviour"+"add":
		case "behaviour"+"get":
		case "behaviour"+"get"+"rank":
		case "behaviour"+"get"+"score":
		case "behaviour"+"rank":
		case "behaviour"+"rem":
		case "behaviour"+"remove":
		case "behaviour"+"set":
		case "behaviour"+"worst":
		// case "behave"+"reset": // TODO
		// case "behaviour"+"reset": // TODO
			// console.log(logPrefix()+"command: '%s'", command);
			// console.log(logPrefix()+"word count:", words.length);

			cmd = command;
			cmd = cmd.replace('behave', '');
			cmd = cmd.replace('behaviour', '');
			cmd = cmd.trim();

			console.log(logPrefix()+"Behaviour cmd:", cmd);
			if (!cmd && words.length && isNaN(parseInt(words[0])))
				cmd = words.shift().toLowerCase(); // read sub-command
			else if (!cmd)
				cmd = 'worst'; // default command

			console.log(logPrefix()+"Behaviour cmd:", cmd);
			if (readCommands.indexOf(cmd)<0 && (!words.length || isNaN(words[0]))) {
				let msg = "Invalid behaviour command! (missing a number)";
				console.warn(logPrefix()+msg);
				message.reply(msg);
				return;
			}

			if (readCommands.indexOf(cmd)<0) {
				delta = parseInt(words.shift());
				if (delta<0) {
					message.reply("Invalid delta detected!");
					console.warn(logPrefix()+"Invalid delta (%s)!", delta);
					return;
				}

				console.log(logPrefix()+"Delta = %d", delta);
			}

			// Remember what was parsed:
			message.behaveCommand = cmd;
			message.behaveDelta = delta;
			message.readCommands = readCommands;
			message.unparsedArgs = words;

			if (allycode) {
				if (readCommands.indexOf(cmd) >= 0) {
					tools.getGuildDbStats(player, message, (allycode, message, guild) => {
						tools.handleBehaviour(guild, message, player);
					});
				} else {
					tools.getGuildStats(player, message, tools.handleBehaviour);
				}
			} else {
				console.log(logPrefix()+"Try with Discord ID:", user.id);
				if (readCommands.indexOf(cmd) >= 0) {
					tools.getPlayerFromDiscordUser(user, message, player => {
						tools.getGuildDbStats(player, message, (allycode, message, guild) => {
							tools.handleBehaviour(guild, message, player);
						});
					});
				} else {
					tools.getPlayerFromDiscordUser(user, message, player => {
						tools.getGuildStats(player, message, tools.handleBehaviour);
					});
				}
			}
			break;

		case "cc":
		case "check"+"config":
		case "config"+"check":
			if (message.author.id !== config.discord.ownerID) {
				message.reply("You're not my master! :imp:");
				return;
			}

			message.channel.send("Configuration check:");

			config = require("./config.json");
			tplCfg = require("./config-template.json");

			// Check config:
			try {
				checkConfig();
				message.channel.send(":white_check_mark: This bot configuration seems all right.");
			} catch(exc) {
				message.channel.send(exc);

				let msg = "Compare 'config-template.json' & 'config.json' to find the mistake.";
				message.channel.send(msg);
			}
			break;

		case "chan":
		case "channel":
		case "channel"+"info":
			lines = ["Channel ID: "+message.channel.id+", type: "+message.channel.type];
			console.log(logPrefix()+lines);
			message.channel.send(lines);
			break;

		case "ci":
		case "char"+"info":
		case "character"+"info":
		case "portrait": {
			let msg = '';
			// Look for a character name:
			words.forEach(word => { // ignore tags/mentions & allycodes:
				if (word.indexOf("<")<0 && word.match(/[a-z0-9]/i)) {
					msg+= " "+locutus.ucfirst(word);
				}
			});

			if (!msg) {
				msg = "No character name found in your message!";
				console.warn(logPrefix()+msg);
				message.reply(msg);
				return;
			}

			msg = msg.trim();
			console.log(logPrefix()+"Character to look for is:", msg);
			if (allycode) {
				tools.getPlayerStats(player, message,
					(player, message) => view.showUnitInfo(player, message, msg, 1)
				);
			} else {
				console.log(logPrefix()+"Try with Discord ID:", user.id);
				tools.getPlayerFromDiscordUser(user, message, player => {
					tools.getPlayerStats(player, message,
						(player, message) => view.showUnitInfo(player, message, msg, 1)
					);
				});
			}
			break;
		}

		case "cgp":
		case "cu"+"gp":
		case "chk"+"gp":
		case "check"+"gp":
		case "check"+"units"+"gp": {
			let limit = 21;
			if (allycode) {
				tools.getPlayerStats(player, message, (player, message) => {
					return tools.checkUnitsGp(player, message, limit);
				});
			} else {
				console.log(logPrefix()+"Try with Discord ID:", user.id);
				tools.getPlayerFromDiscordUser(user, message, player => {
					tools.getPlayerStats(player, message, (player, message) => {
						return tools.checkUnitsGp(player, message, limit);
					});
				});
			}
			break;
		}

		case "cm":
		case "chk"+"mod":
		case "chk"+"mods":
		case "check"+"mod":
		case "check"+"mods":
		case "check"+"modules":
			if (allycode) {
				tools.getPlayerStats(player, message, tools.checkPlayerMods);
			} else {
				console.log(logPrefix()+"Try with Discord ID:", user.id);
				tools.getPlayerFromDiscordUser(user, message, player => {
					tools.getPlayerStats(player, message, tools.checkPlayerMods);
				});
			}
			break;

		case "ccu":
		case "check"+"conquest":
		case "check"+"conquest"+"units":
			if (allycode) {
				tools.getPlayerStats(player, message,
					(player, message) => tools.checkConquestUnits(player, message)
				);
			} else {
				console.log(logPrefix()+"Try with Discord ID:", user.id);
				tools.getPlayerFromDiscordUser(user, message, player => {
					tools.getPlayerStats(player, message,
						(player, message) => tools.checkConquestUnits(player, message)
					);
				});
			}
			break;

		case "contest": // same as contest top
		case "contest"+"add":
		case "contest"+"get":
		case "contest"+"get"+"rank":
		case "contest"+"get"+"score":
		case "contest"+"rank":
		case "contest"+"rem":
		case "contest"+"remove":
		case "contest"+"reset":
		case "contest"+"set":
		case "contest"+"top":
		case "rank": {
			cmd = command.replace('contest', '');

			if (!cmd && words.length && isNaN(parseInt(words[0]))) {
				cmd = words.shift().toLowerCase(); // read sub-command
			} else if (!cmd) {
				cmd = 'top'; // default command
			}
			console.log(logPrefix()+"Contest command:", cmd);
			let cmdIdx = readCommands.indexOf(cmd);

			if (cmdIdx<0 && cmd!=="reset" && (!words.length || isNaN(words[0]))) {
				let msg = "Invalid contest command! (missing a number)";
				console.warn(logPrefix()+msg);
				message.reply(msg);
				return;
			}

			if (cmd!=="reset" && cmdIdx<0) {
				delta = parseInt(words.shift());
				if (delta<0) {
					message.reply("Invalid delta detected!");
					console.warn(logPrefix()+"Invalid delta (%s)!", delta);
					return;
				}

				console.log(logPrefix()+"Delta = %d", delta);
			}

			// Remember what was parsed:
			message.contestCommand = cmd;
			message.contestDelta = delta;
			message.readCommands = readCommands;
			message.unparsedArgs = words;

			if (allycode) {
				if (cmdIdx >= 0) {
					tools.getGuildDbStats(player, message, (allycode, message, guild) => {
						tools.handleContest(guild, message, player);
					});
				} else {
					tools.getGuildStats(player, message, tools.handleContest);
				}
			} else {
				console.log(logPrefix()+"Try with Discord ID:", user.id);
				if (cmdIdx >= 0) {
					tools.getPlayerFromDiscordUser(user, message, player => {
						tools.getGuildDbStats(player, message, (allycode, message, guild) => {
							tools.handleContest(guild, message, player);
						});
					});
				} else {
					tools.getPlayerFromDiscordUser(user, message, player => {
						tools.getGuildStats(player, message, tools.handleContest);
					});
				}
			}
			break;
		}

		case "cg"+"tu":
		case "ct"+"gu":
		case "count"+"guild"+"top"+"units": {
			let minRelics = 5;

			sql = "SELECT guildRefId FROM `users` WHERE discord_id=" + user.id;

			sql = "SELECT count(p.id) AS nbUnits, p.game_name AS player"+
				" FROM `users` p"+
				" LEFT JOIN `units` u ON p.allycode=u.allycode"+
				" WHERE p.guildRefId=("+sql+") AND u.relic>="+minRelics+
				" GROUP BY p.id ORDER BY nbUnits DESC";

			// console.log(logPrefix()+"CG"+"TU SQL:\n"+sql); // for debug only
			db_pool.query(sql, (exc, records) => {
				if (exc) {
					console.log("SQL:", sql);
					console.log(logPrefix()+"CG"+"TU Exception:", exc.sqlMessage? exc.sqlMessage: exc);
					message.reply("Failed! This command only support tags or self (no allycode mode).");
					return;
				}

				let i = 0;
				let sum = 0;
				records.forEach(record => {
					let nbu = record.nbUnits>99? record.nbUnits: (" "+record.nbUnits);
					let num = ++i;

					if (num<=9) num = "0"+num;
					lines.push("`" + num + "/ " + nbu+"` "+record.player);
					sum += record.nbUnits;
				});
				lines.push("**Total number of units with "+minRelics+" relics or more: "+sum+"**");

				richMsg = new RichEmbed().setTitle("Guild top units ("+i+" players)")
					.setDescription(lines).setTimestamp().setColor("GREEN")
					.setFooter(config.footer.message, config.footer.iconUrl);

				message.channel.send(richMsg);
			});
			break;
		}

		case "licence":
		case "license":
			lines.push("This free software is published under the Apache License 2.0");
			lines.push("http://www.apache.org/licenses/LICENSE-2.0");
			richMsg = new RichEmbed().setTitle("License").setColor("GREEN")
				.setDescription(lines).setTimestamp()
				.setFooter(config.footer.message, config.footer.iconUrl);
			message.channel.send(richMsg);
			break;

		case "destroy":
		case "leave":
		case "stop":
			if (message.author.id !== config.discord.ownerID) {
				message.reply("You're not my master! :imp:");
			} else {
				message.reply("Up to your will master. Leaving...");

				let msg = "I was started at: "+tools.toMySQLdate(start)+" GMT.\n";

				msg += "I was listening since: "+tools.toMySQLdate(listen_since)+" GMT.";
				console.log(logPrefix()+msg);
				clearInterval(timer);
				message.channel.send(msg).then(() => {
					console.log(logPrefix()+"STOPPING!");

					db_pool.end(tools.db_close);
					console.log(logPrefix()+"I'm OFF.");
					client.destroy();
				}).catch(console.error);
			}
			break;

		case "dis":
		case "repeat":
		case "say": {
			let destChannels = [message.channel];
			let myMsg = '';

			words.forEach(word => { // ignore channels:
				if (word.indexOf("<#")<0 && word.match(/[a-z]/i)) {
					myMsg+= word+" ";
				}
			});

			let n = message.mentions.channels.array().length;
			if (n) {
				destChannels = message.mentions.channels.array();
				console.log(logPrefix()+"Found %d destination channel(s).", n);
			}

			if (myMsg) {
				destChannels.forEach(channel => channel.send(myMsg));
			} else {
				message.reply("what can I say for you?");
			}
			break;
		}

		case "fetch":
			if (allycode) {
				tools.fetchSwgohData(player, message, view.showSwgohData);
			} else {
				console.log(logPrefix()+"Try with Discord ID:", user.id);
				tools.getPlayerFromDiscordUser(user, message, player => {
					tools.fetchSwgohData(player, message, view.showSwgohData);
				});
			}
			break;

		case "gac"+"h":
		case "gac"+"history":
		case "gg":
		case "profile": {
			let link = "";

			if (allycode) {
				searchStr = "p.allycode="+allycode;
			}
			sql = "SELECT p.* FROM `users` p WHERE "+searchStr;
			db_pool.query(sql, (exc, result) => {
				let msg = '';

				if (exc) {
					console.log("SQL:", sql);
					console.log(logPrefix()+"AC Exception:", exc.sqlMessage? exc.sqlMessage: exc);
				} else {
					console.log(logPrefix()+result.length+" record(s) match(es):", search);
					// console.dir(result);
					if (result.length <= 0) {
						msg = "No match found!";
						console.log(logPrefix()+msg);
						message.reply(msg);

						if (allycode) {
							link = command.slice(1, 2)==='a'?
								"https://swgoh.gg/p/"+allycode+"/gac-history/":
								"https://swgoh.gg/p/"+allycode+"/";
							console.log(logPrefix()+link);
							message.channel.send(link);
						}
					} else if (result.length > 1) {
						lines.push("There are "+result.length+" matches:");
						result.forEach(user => {
							msg = user.allycode+" is allycode of: "+user.game_name;
							console.log(logPrefix()+msg);
							lines.push("`"+user.allycode+"` is allycode of: "+user.game_name);
						});
						message.reply(lines);
					} else { // 1 result here
						let label = command.slice(1, 2)==='a'? "GAC history": "profile";

						user = result[0];
						allycode = user.allycode;
						link = command.slice(1, 2)==='a'?
							"https://swgoh.gg/p/"+allycode+"/gac-history/":
							"https://swgoh.gg/p/"+allycode+"/";
						msg = user.game_name+"'s "+label+" is: "+link;
						console.log(logPrefix()+msg);
						message.channel.send(msg);
					}
				}
			});
			break;
		}

		case "gb":
		case "guild"+"board": {
			let strToLookFor = words.join(" ").trim() || 'ProXima';

			sql = 'SELECT'+
				' g.memberCount,'+
				' g.officerCount,'+
				' round(g.gp / 1000000) AS M_GP,'+
				' g.name,'+
				' g.gm_allycode,'+
				' g.ts AS gts,'+
				' a.name AS Alliance '+
				'FROM guilds g'+
				' LEFT JOIN `alliances` a ON g.alliance_id=a.id'+
				' WHERE a.name LIKE "%'+strToLookFor+'%"'+
				' ORDER BY gp DESC';

			db_pool.query(sql, (exc, result) => {
				let col = "ORANGE";
				let now = new Date;
				let update = new Date;
				let title = "Guild board";

				if (exc) {
					console.log("SQL:", sql);
					console.log(
						logPrefix()+"GB Exception:",
						exc.sqlMessage? exc.sqlMessage: exc.code
					);

					col = "RED";
					lines = [exc.sqlMessage? exc.sqlMessage: exc.code];
				} else {
					let n = result.length;

					console.log(logPrefix()+"%d record(s) in the result", n);
					if (!n) {
						if (n===0) lines = ["No match."];
					} else {
						title += ' for '+result[0].Alliance;
					}

					let oldest_g = null;
					let tot_player_cnt = 0; // total player count
					result.forEach(g => {
						let gp = g.M_GP;

						if (gp < 10) gp = '  '+gp;
						else
						if (gp <100) gp = ' ' +gp;

						tot_player_cnt += g.memberCount;
						if (g.memberCount<=9) g.memberCount = ' '+g.memberCount;
						if (g.officerCount) {
							if (g.officerCount<=9) g.officerCount = ' '+g.officerCount;
							lines.push('`'+gp+'M '+g.officerCount+' off/'+g.memberCount+'` '+g.name);
						} else {
							lines.push('`'+gp+'M '+g.memberCount+' ppl/50` '+g.name);
						}

						if (g.gts<update) {
							update = g.gts;
							oldest_g = g;
						}
					});

					let seats_left = n * 50 - tot_player_cnt;
					let msg = 'Total: '+tot_player_cnt+' players in '+n+' guilds';
					lines.push(''); // blank line
					lines.push(msg+' ('+seats_left+' seats left)');

					let day = update.toISOString().slice(0, 10); // keep date only (forget time)
					let today = now.toISOString().slice(0, 10); // keep date only (forget time)

					console.log(logPrefix()+"Today:", today);
					console.log(logPrefix()+"_ day:", day);
					if (oldest_g && day!==today) {
						lines.push(''); // blank line
						lines.push("Oldest guild refresh is about: "+oldest_g.name);
						if (oldest_g.gm_allycode) {
							lines.push(
								"DM this to refresh: `gs "+
								tools.cleanAc(oldest_g.gm_allycode)+"`"
							);
						}
					} else {
						col = "GREEN";
					}
				}

				let richMsg = new RichEmbed().setTitle(title).setColor(col)
					.setDescription(lines).setTimestamp(update)
					.setFooter(config.footer.message, config.footer.iconUrl);

				message.channel.send(richMsg);
			});
		}
		break;

		case "gl":
		case "glc":
		case "gl"+"check":
		case "gl"+"req":
		case "check":
		case "check"+"gl":
		case "checklist":
		case "cl":
			if (allycode) {
				tools.getPlayerStats(player, message,
					(player, message) => tools.checkLegendReq(player, message)
				);
			} else {
				console.log(logPrefix()+"Try with Discord ID:", user.id);
				tools.getPlayerFromDiscordUser(user, message, player => {
					tools.getPlayerStats(player, message,
						(player, message) => tools.checkLegendReq(player, message)
					);
				});
			}
			break;

		case "gs":
		case "guild"+"stat":
		case "guild"+"stats":
			if (allycode) {
				tools.getGuildStats(player, message, view.showGuildStats);
			} else {
				console.log(logPrefix()+"Try with Discord ID:", user.id);
				tools.getPlayerFromDiscordUser(user, message, player => {
					tools.getGuildStats(player, message, view.showGuildStats);
				});
			}
			break;

		case "ggs":
		case "gps":
		case "getGuildStats":
		case "guildPlayersStat":
		case "guildPlayersStats":
			if (allycode) {
				tools.getGuildDbStats(player, message, view.guildPlayerStats);
			} else {
				console.log(logPrefix()+"Try with Discord ID:", user.id);
				tools.getPlayerFromDiscordUser(user, message, player => {
					tools.getGuildDbStats(player, message, view.guildPlayerStats);
				});
			}
			break;

		case "gte":
		case "gt"+"export":
		case "gtg":
		case "gt"+"get":
		case "territory"+"war"+"export":
		case "territory"+"war"+"get":
		case "twe":
		case "twg":
		case "tw"+"get":
			if (config.twResults.admins.indexOf(message.author.id)<0) {
				lines = ["Only TW admins can export the data file!"];
				console.log(logPrefix()+lines[0]);
				message.reply(logPrefix()+lines[0]);
				return;
			}

			if (allycode) {
				tools.territoryWarGet(player, message);
			} else {
				console.log(logPrefix()+"Trying with Discord ID:", user.id);
				tools.getPlayerFromDiscordUser(user, message, player => {
					tools.territoryWarGet(player, message);
				});
			}
			break;

		case "gtr":
		case "rgt":
		case "rtw":
		case "reg"+"tw":
		case "reg"+"territory"+"war":
		case "register"+"territory"+"war":
		case "twr":
		case "tw"+"reg":
		case "tw"+"register":
			if (message.channel.id !== config.twResults.regChanId) {
				lines = "This command is restricted to <#"+config.twResults.regChanId+
					"> channel (on the Mercato Discord)";
				console.log(logPrefix()+lines);
				message.reply(lines);
				return;
			}

			if (allycode) {
				tools.territoryWarReg(player, message);
			} else {
				console.log(logPrefix()+"Trying with Discord ID:", user.id);
				tools.getPlayerFromDiscordUser(user, message, player => {
					if (!player.allycode) {
						console.log(logPrefix()+"Please register first with: reg your-ally-code")
						message.reply("Please register first with: reg your-ally-code")
						return;
					}

					tools.territoryWarReg(player, message);
				});
			}
			break;

		case "tw"+"reset":
			if (config.twResults.admins.indexOf(message.author.id)<0) {
				lines = ["Only TW admins can reset TW data!"];
				console.log(logPrefix()+lines[0]);
				message.reply(logPrefix()+lines[0]);
				return;
			}

			tools.territoryWarReset(player, message);
			break;

		case "gu":
		case "gup":
		case "get"+"unregistered":
		case "get"+"unreg"+"players":
		case "get"+"unregistered"+"players":
			if (allycode) {
				tools.getUnregPlayers(allycode, message);
			} else {
				console.log(logPrefix()+"Try with Discord ID:", user.id);
				tools.getPlayerFromDiscordUser(user, message, player => {
					tools.getUnregPlayers(player.allycode, message);
				});
			}
			break;

		case "help":
			richMsg = new RichEmbed().setTitle("Available commands")
				.setDescription([
					"**User commands:**",
					" abbr/abbreviations, about, aide, allycode (ac), chan(nelInfo), charInfo (ci),"+
					" checkMods (cm), checkUnitsGp"+
					" (cugp), countGuildTopUnits (cgtu), gacH/gacHistory, (gl)Check (glc), getUnregisteredPlayers (gup),"+
					" guildBoard (gb), guildStats (gs), help, invite, (last)evols (le), listGuildMembers (lgm),"+
					" omicronList (ol/omicrons),"+
					" playerStat (ps), profile (gg), register (reg), relics, repeat, say, self(y), shipInfo (si),"+
					" sources (src), start, stats, status, unreg/unregister, war"+"stats (ws), whoami, whois",
					"**Behaviour commands:**",
					"*Order : behave|behaviour (subcommand) (points) (user)*",
					" behave, behave( )add, behave( )get, behave( )rank, behave( )rem(ove),",
					" behave( )rank, behave( )worst",
					"**Contest commands:** *Order: contest (subCommand) (points) (user)*",
					" contest, contest( )add, contest( )get, contest( )rank, contest( )rem(ove),",
					" contest( )top, rank",
					"**Admin commands:**",
					" admin, configCheck (cc), destroy/leave/shutdown/stop, query/req/request",
					"**NB1:** in DM, prefix is optional.",
					"**NB2:** most of commands accept a user's tag or an ally code (9 digits).",
					"**NB3:** the default target is the command writer (\"me\" is useless).",
					"**NB4:** order of arguments is up to you (except for contest and behave commands)."])
				.setTimestamp()
				.setFooter(config.footer.message, config.footer.iconUrl);
			message.channel.send(richMsg);
			break;

		case "invite":
			// https://discordapp.com/api/oauth2/authorize?client_id=629346604075450399&permissions=2112&scope=bot
			lines.push("Follow this link to invite me to your server(s): http://bit.ly/JukeSwgohBot");
			richMsg = new RichEmbed().setTitle("Invite").setColor("GREEN")
				.setDescription(lines).setTimestamp()
				.setFooter(config.footer.message, config.footer.iconUrl);
			message.channel.send(richMsg);
			break;

		case "le":
		case "evol":
		case "evols":
		case "last"+"evol":
		case "last"+"evols":
			if (allycode) {
				tools.getPlayerStats(player, message, tools.getLastEvolsFromDb);
			} else {
				console.log(logPrefix()+"Try with Discord ID:", user.id);
				tools.getPlayerFromDiscordUser(user, message, player => {
					tools.getPlayerStats(player, message, tools.getLastEvolsFromDb);
				});
			}
			break;

		case "lgm":
		case "list"+"guild"+"members":
			if (allycode) {
				tools.getGuildDbStats(player, message, view.listGuildMembers);
			} else {
				console.log(logPrefix()+"Try with Discord ID:", user.id);
				tools.getPlayerFromDiscordUser(user, message, player => {
					tools.getGuildDbStats(player, message, view.listGuildMembers);
				});
			}
			break;

		case "ol":
		case "omicron"+"list":
		case "omicrons":
			if (allycode) {
				tools.getPlayerStats(player, message, view.listOmicrons);
			} else {
				console.log(logPrefix()+"Try with Discord ID:", user.id);
				tools.getPlayerFromDiscordUser(user, message, player => {
					tools.getPlayerStats(player, message, view.listOmicrons);
				});
			}
			break;

		case "pi":
		case "ps":
		case "player"+"info":
		case "player"+"stat":
		case "player"+"stats":
			if (allycode) {
				tools.getPlayerStats(player, message, view.showPlayerStats);
			} else {
				console.log(logPrefix()+"Try with Discord ID:", user.id);
				tools.getPlayerFromDiscordUser(user, message, player => {
					tools.getPlayerStats(player, message, view.showPlayerStats);
				});
			}
			break;

		case "rf":
		case "randomFleet":
		case "rt":
		case "rand":
		case "random":
		case "randomTeam":
			if (allycode) {
				tools.getPlayerStats(player, message, view.showRandomTeam);
			} else {
				console.log(logPrefix()+"Try with Discord ID:", user.id);
				tools.getPlayerFromDiscordUser(user, message, player => {
					tools.getPlayerStats(player, message, view.showRandomTeam);
				});
			}
			break;

		case "reg":
		case "register":
			if (!allycode) {
				let msg = "Allycode is invalid or missing!";
				console.warn(msg+" about: "+nick);
				message.reply(":warning: "+msg);
				return;
			}

			sql = "INSERT INTO `users` (discord_id, discord_name, allycode, game_name) VALUES (?, ?, ?, ?)";

			// Register:
			db_pool.query(sql, [user.id, user.username, allycode, nick], (exc, result) => {
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
					message.reply(":white_check_mark: "+nick+" registered.");
					console.log(logPrefix()+"%d user inserted:", result.affectedRows, nick);
					return;
				}

				sql = "UPDATE `users` SET discord_id=?, discord_name=? WHERE allycode=?";

				// Update an existing registration:
				db_pool.query(sql, [user.id, nick, allycode], (exc, result) => {
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
						message.reply(":white_check_mark: "+nick+" registered.");
						console.log(logPrefix()+"%d user updated:", result.affectedRows, nick);
					}
				});
			});
			break;

		case "rg":
		case "rgs":
		case "refreshGuildStats":
			if (message.author.id !== config.discord.ownerID) {
				message.reply("You're not my master! :imp:");
				return;
			}

			if (allycode) {
				tools.refreshGuildStats(allycode, message, view.guildPlayerStats);
			} else {
				console.log(logPrefix()+"Try with Discord ID:", user.id);
				tools.getPlayerFromDiscordUser(user, message, player => {
					tools.refreshGuildStats(player.allycode, message, view.guildPlayerStats);
				});
			}
			break;

		case "si":
		case "ship"+"info": {
			// Look for a ship name:
			let tmpMsg = '';
			words.forEach(function(word) {
				// ignore tags/mentions & allycodes:
				if (word.indexOf("<")<0 && word.match(/[a-z]/i)) {
					tmpMsg+= " "+locutus.ucfirst(word);
				}
			});

			if (!tmpMsg) {
				console.warn(logPrefix()+"No ship name found in the message!" );
				message.reply("No ship name found in your message!");
				return;
			}

			tmpMsg = tmpMsg.trim();
			console.log(logPrefix()+"Ship to look for is:", tmpMsg);
			if (allycode) {
				tools.getPlayerStats(player, message, (player, message) => {
					return view.showUnitInfo(player, message, tmpMsg, 2);
				});
			} else {
				console.log(logPrefix()+"Try with Discord ID:", user.id);
				tools.getPlayerFromDiscordUser(user, message, player => {
					tools.getPlayerStats(player, message, (player, message) => {
						return view.showUnitInfo(player, message, tmpMsg, 2);
					});
				});
			}
			break;
		}

		case "tc":
		case "rel":
		case "relic":
		case "relics":
		case "top"+"char":
		case "top"+"chars":
			if (allycode) {
				tools.getPlayerStats(player, message, view.showPlayerRelics);
			} else {
				console.log(logPrefix()+"Try with Discord ID:", user.id);
				tools.getPlayerFromDiscordUser(user, message, player => {
					tools.getPlayerStats(player, message, view.showPlayerRelics);
				});
			}
			break;

		case "req":
		case "sql":
		case "query":
		case "request":
			if (message.author.id !== config.discord.ownerID) {
				message.reply("You're not my master! :imp:");
				return;
			}

			sql = words.join(" ");
			db_pool.query(sql, (exc, result) => {
				let col = "ORANGE";
				let title = "DB request";

				if (exc) {
					console.log("SQL:", sql);
					console.log(logPrefix()+"RQ Exception:", exc.sqlMessage? exc.sqlMessage: exc.code);

					col = "RED";
					lines = [exc.sqlMessage? exc.sqlMessage: exc.code];
				} else {
					let n = result.length;

					console.log(logPrefix()+"%d record(s) in the result", n);
					if (!n) {
						if (n===0) lines = ["No match."];

						n = result.affectedRows;
						if (n) {
							col = "GREEN";
							lines = [];
						}
						if (typeof(n)==='number') {
							let s = n===1? '': 's';
							lines.push(n+" affected row"+s);
						}
					} else {
						let col_sep = " \t";
						let headers = [];
						let maxLen = 0;

						col = "GREEN";
						result.forEach((record, i) => {
							if (i>9) return; // LIMIT 10 (0 to 9)
							if (!i) headers = Object.keys(record);

							let line = Object.values(record).join(col_sep);
							lines.push("`"+line+"`");
							if (line.length>maxLen) maxLen = line.length;
						});

						// Add headers:
						let header = headers.join(col_sep);
						lines.unshift("`"+'-'.repeat(maxLen)+"`");
						lines.unshift("`"+header+"`");

						let s = n===1? '': 's';
						title+= " ("+n+" total result"+s+")";
					}
				}

				try {
					richMsg = new RichEmbed().setTitle(title).setColor(col)
						.setDescription(lines).setTimestamp()
						.setFooter(config.footer.message, config.footer.iconUrl);
					message.channel.send(richMsg).catch(ex => {
						console.warn(ex);
						message.reply(ex.message);
						message.channel.send(lines);
					});
				} catch(ex) {
					console.warn(ex);
					message.reply(ex.message);
					message.channel.send(lines);
				}
			});
			break;

		case "stats":
		case "mem"+"stat":
			sql = "SELECT COUNT(p.id) AS cnt, g.name";
			sql+= " FROM `guilds` g, `users` p";
			sql+= " WHERE p.guildRefId=g.swgoh_id"; // join
			sql+= " GROUP BY guildRefId";
			sql+= " ORDER BY cnt DESC, g.name ASC";

			db_pool.query(sql, (exc, result) => {
				let maxLines = 10;
				let s = 's';
				let tpc = 0; // total player count

				if (exc) {
					console.log("SQL:", sql);
					console.log(logPrefix()+"MS Exception:", exc.sqlMessage? exc.sqlMessage: exc.code);
					return;
				}

				console.log(logPrefix()+"%d guilds in the result", result.length);

				if (result.length) {
					lines.push("");
					result.forEach((guild, i) => {
						tpc+= guild.cnt;

						if (i<maxLines) {
							s = guild.cnt > 1 ? 's' : '';
							if (guild.cnt <= 9) guild.cnt = '0' + guild.cnt;
							lines.push("`"+guild.cnt+"` player"+s+" in: "+guild.name);
						} else if (i===maxLines) {
							lines.push("And "+(result.length - i)+" more...");
						}
					});
				}
				console.log(logPrefix()+"%d guilds & %d users in the result", result.length, tpc);
				lines.unshift("**"+tpc+" player(s) registered in "+result.length+" guilds**");

				richMsg = new RichEmbed()
					.setTitle("Memory status").setColor("GREEN")
					.setDescription(lines)
					.setTimestamp()
					.setFooter(config.footer.message, config.footer.iconUrl);
				message.channel.send(richMsg);
			});
			break;

		case "sources":
		case "src":
			message.channel.send("Official repository: https://github.com/PixEye/juke-swgoh-bot");
			break;

		case "start":
		case "status": {
			let nbg = 0; // number of registered guilds
			let nbp = 0; // number of registered players
			// let servers = [];

			lines = [];
			lines.push("`Started at..: "+tools.toMySQLdate(start)+" GMT`");
			lines.push("`Listen since: "+tools.toMySQLdate(listen_since)+" GMT`");
			lines.push("Down time in minutes: "+Math.round(down_time/1000/60));
			if (message.author.id === config.discord.ownerID) {
				let percent = msgCount? Math.round(100 * cmdCount / msgCount): 0;
				let msg = "I found "+cmdCount+" commands" +
					" out of "+msgCount+" human messages => "+percent+"%";

				lines.push(msg);
				lines.push("I also found "+botMsgCount+" bot messages.");
			}
			console.log(logPrefix()+"Down time in minutes: "+Math.round(down_time/1000/60));
			message.channel.send(lines);

			sql = "SELECT COUNT(`id`) AS nbg FROM `guilds`";
			db_pool.query(sql, (exc, result) => {
				if (exc) {
					console.log("SQL:", sql);
					console.log(logPrefix()+"ST1 Exception:", exc.sqlMessage? exc.sqlMessage: exc);
					message.reply("Exception: failed to count registered guilds!");
					return;
				}

				if (result.length !== 1) {
					console.log(logPrefix()+result.length+" result(s) to count guilds!");
					message.reply("Failed to count registered guilds!");
					return;
				}

				nbg = result[0].nbg; // nbg = number of guilds
				console.log(logPrefix()+"    %d guild(s) registered", nbg);

				sql = "SELECT COUNT(`id`) AS nbp FROM `users`"; // nbp = number of players
				db_pool.query(sql, (exc, result) => {
					if (exc) {
						console.log("SQL:", sql);
						console.log(logPrefix()+"ST2 Exception:", exc.sqlMessage? exc.sqlMessage: exc.code);
						message.reply("Exception: failed to count registered players!");
						return;
					}

					if (result.length !== 1) {
						console.log(logPrefix()+result.length+" result(s) to count users!");
						message.reply("Failed to count registered users!");
						return;
					}

					nbp = result[0].nbp; // nbp = number of players
					let avg = nbg? Math.round(nbp / nbg): nbp; // average per guild
					console.log(logPrefix()+"   %d user(s) registered (average = %d per guild)", nbp, avg);

					sql = "SELECT COUNT(`id`) AS nbu FROM `units`"; // nbp = number of units
					db_pool.query(sql, (exc, result) => {
						if (exc) {
							console.log("SQL:", sql);
							console.log(logPrefix()+"ST3 Exception:", exc.sqlMessage? exc.sqlMessage: exc.code);
							message.reply("Exception: failed to count registered players!");
							return;
						}

						if (result.length !== 1) {
							console.log(logPrefix()+result.length+" result(s) to count users!");
							message.reply("Failed to count registered units!");
							return;
						}

						let nbu = result[0].nbu; // nbu = number of units
						let avg = nbp? Math.round(nbu / nbp): nbu; // average per player
						console.log(logPrefix()+"%d unit(s) registered (average = %d per user)", nbu, avg);

						nbg = locutus.number_format(nbg);
						nbp = locutus.number_format(nbp);
						nbu = locutus.number_format(nbu);
						message.channel.send(nbg+" guilds, "+nbp+" players & "+nbu+" units registered.");
					})
				})
			})
			break;
		}

		case "self":
		case "selfy":
			nick += "'s";
			view.showWhoIs(user, nick, message);
			break;

		case "unreg":
		case "unregister":
			user = message.author;
			search = user.id;
			searchStr = "`discord_id`=" + search;
			if (allycode) searchStr += " AND `allycode`=" + allycode;
			sql = "DELETE FROM `users` WHERE " + searchStr + ' LIMIT 1';

			// Update an existing registration:
			db_pool.query(sql, [], (exc, result) => {
				if (exc) {
					console.log("Unreg SQL:", sql);
					if (exc.sqlMessage) {
						console.log(Date()+ " - Unreg Exception 1:", exc.sqlMessage);
						message.reply(":red_circle: Error: "+exc.sqlMessage);
					} else {
						console.log(logPrefix()+"Unreg Exception 2:", exc);
						message.reply(":red_circle: Error!");
					}
				} else if (result.affectedRows) {
					message.reply(":white_check_mark: "+nick+" unregistered where "+searchStr);
					console.log(logPrefix()+"%d user(s) updated:", result.affectedRows, nick);
				} else {
					console.log(logPrefix()+"%d user(s) updated:", result.affectedRows, nick);
					console.log("Unreg SQL:", sql);
					message.reply([
						":red_circle: Nothing has changed. You cannot unregister someone else!",
						":red_circle: The player should unregister on its own."
					]);
				}
			});
			break;

		case "whois":
			view.showWhoIs(user, nick, message);
			break;

		case "whoami":
			nick = (nick==="My")? nick: (nick+"'s");
			view.showWhoIs(user, nick, message);
			break;

		case "ws":
		case "war"+"stat":
		case "war"+"stats": {
			let link = "https://goh.warstats.net/players/view/";

			if ( ! allycode) {
				console.log(logPrefix()+"Try with Discord ID:", user.id);
				tools.getPlayerFromDiscordUser(user, message, player => {
					link += player.allycode;
					message.channel.send(link);
				});
			} else {
				link += player.allycode;
				message.channel.send(link);
			}
			break;
		}

		default:
			message.reply("I don't get it. :thinking:");
			console.log(logPrefix()+"Unknown command was: "+command);
			if (message.channel.type==="dm") {
				console.log(logPrefix()+"Direct message was: "+message.content);
			}
	}
});

function getUserFromMention(mention, message) {
	if (!mention) throw "Word to parse is empty";

	if (mention.startsWith('<@') && mention.endsWith('>')) {
		let id = mention.slice(2, -1);

		if (id.startsWith('!')) {
			id = id.slice(1);
		}
		if (client.users.cache) {
			return client.users.cache.get(id);
		}

		if (message) {
			let user = message.mentions.users.array().find(u => { return u.id === id; });

			if (user) {
				// console.log(logPrefix()+"Found matching user:", user);
				/* Keys example: User {
					id: '828626977509343302',
					username: 'kogan',
					discriminator: '5294',
					avatar: null,
					bot: false,
					lastMessageID: null,
					lastMessage: null } */
				if (!user.createdAt) user.createdAt = new Date(0);
				if (!user.presence ) user.presence  = {"status": "Unknown"};

				return user;
			}
		}
		console.warn("Did not find user with ID: "+id+" (use a generic name)");

		return {
			"createdAt": new Date(0),
			"id": id,
			"presence": {"status": "Unknown"},
			"username": "User"
		};
	}

	throw "No mention found";
}

/** Compare tplCfg & config keys
 * @throws String exception in case of problem
 */
function checkConfig() {
	let n = 0;
	let msg = '';

	if (typeof(tplCfg)!=='object') {
		throw 'Did not find a valid template configuration ("config-template.json" file)!';
	}

	if (typeof(config)!=='object') {
		throw 'Did not find a valid configuration ("config.json" file)!';
	}

	n = 2;
	msg = 'Invalid type in bot configuration for key: ';
	Object.keys(tplCfg).forEach(key => {
		let tplVal = tplCfg[key];

		++n;
		if (typeof(config[key])!==typeof(tplVal)) {
			throw msg+key;
		}

		if (typeof(tplVal)==='object') {
			Object.keys(tplVal).forEach(k => {
				let tplSubVal = tplVal[k];

				++n;
				if (typeof(config[key][k])!==typeof(tplSubVal)) {
					config[key][k] = tplSubVal;
					throw msg+key+'.'+k+'!\n (default value: '+tplSubVal+')';
				}
			});
		}
	});

	console.log(logPrefix()+n+" configuration checks done successfully.");
}

// Main:
client.login(config.discord.token);

/* SQL query to request for orphan players:
SELECT allycode, LEFT(ts, 19) AS last_update, game_name FROM `users`
WHERE guildRefId NOT IN (SELECT DISTINCT swgoh_id FROM `guilds`) */

// vim: noexpandtab
