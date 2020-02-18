/**
 * tools.js is the functions module for Juke's SWGoH Discord bot
 * @author PixEye@pixeye.net
 * @since 2019-12-09
 */

// jshint esversion: 8

// Extract the required classes from the discord.js module:
const { RichEmbed } = require("discord.js");

// Create an instance of a Discord client:
//const client = new Client();

// Get the configuration from a separated JSON file:
const config = require("./config.json");

// Remember when this program started:
//const start = Date();

// Database connection:
const mysql = require("mysql");

// Load other module(s):
//const locutus = require("./locutus"); // Functions from locutus.io
const swgoh   = require("./swgoh");  // SWGoH API
//const tools = require("./tools");   // Several functions
const view    = require("./view");  // Functions used to display results

// Prepare DB connection pool:
const db_pool = mysql.createPool({
	connectionLimit: config.db.conMaxCount,
	database       : config.db.name,
	host           : config.db.host,
	password       : config.db.pw,
	user           : config.db.user
});

exports.db_close = function(exc) {
	let logPrefix = exports.logPrefix; // shortcut

	if (exc) {
		console.warn(logPrefix()+"DB closing exception:", exc);
	}

	if (db_pool && typeof(db_pool.end)==='function') db_pool.end();

	console.log(logPrefix()+"DB connections stopped.");
};

exports.checkPlayerMods = function(player, message) {
	let logPrefix = exports.logPrefix; // shortcut
	let maxLines = 5;

	if (!player.gp) {
		console.log(logPrefix()+"invalid GP for user:", player);
		return;
	}

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
};

exports.checkUnitsGp = function(player, message, limit) {
	let logPrefix = exports.logPrefix; // shortcut

	if (!player.gp) {
		console.log(logPrefix()+"invalid GP for user:", player);
		return;
	}

	let color = "GREEN";
	let minit = limit-1;
	let lines = [];
	let maxGp = limit*1000;
	let maxLines = 10;
	let minGp = minit*1000;
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
	var foundAt = -1;
	let logPrefix = exports.logPrefix; // shortcut

	if (words.join("").trim().length>0) {
		words.forEach(function(word, i) {
			// ignore too short words, tags/mentions & not numeric words:
			if (word.length>8 && word.indexOf("<")<0 && !word.match(/[a-z]/i) && word.match(/[0-9]{3,}/)) {
				allycode = parseInt(word.replace(/[^0-9]/g, ""));
				foundAt = i;
				console.log(logPrefix()+"Found allycode %d at position %d", allycode, i);
			}
		});
		if (foundAt>=0)
			words.splice(foundAt, 1); // remove the allycode word from the command
	}

	return allycode;
};

exports.getGuildDbStats = function(allycode, message, callback) {
	let locale = config.discord.locale; // shortcut
	let logPrefix = exports.logPrefix; // shortcut

	if (!allycode) {
		message.reply(":red_circle: Invalid or missing allycode!");
		return;
	}

	let sql = "SELECT * FROM `guilds` g"; // get guild

	sql+= " WHERE swgoh_id IN (SELECT guildRefId from `users` WHERE allycode=?)";

	message.channel.send("Looking for DB stats of guild with ally: "+allycode+"...")
		.then(msg => {
			db_pool.query(sql, [allycode], function(exc, result) {
				if (typeof(msg.delete)==="function") msg.delete();

				if (exc) {
					let otd = exc.sqlMessage? exc.sqlMessage: exc; // obj to display

					console.log("SQL:", sql);
					console.log(logPrefix()+"GDDBS Exception:", otd);
					message.reply("GGDBS Error: "+otd);
					return;
				}

				// console.log(logPrefix()+"result:", result); // id, swgoh_id, name
				let n = result.length;

				msg = n+" matching guilds found";
				if (n!==1) {
					console.warn(logPrefix()+msg);
					message.reply(msg);
					return;
				}

				let guild = result[0];
				msg = "Matching guild: %s (%s)";
				guild.refId = guild.swgoh_id;
				console.log(logPrefix()+msg, guild.name, guild.refId);

				sql = "SELECT * from `users` WHERE guildRefId=?"; // get players
				db_pool.query(sql, [guild.refId], function(exc, result) {
					if (exc) {
						let otd = exc.sqlMessage? exc.sqlMessage: exc; // obj to display

						console.log("SQL:", sql);
						console.warn(logPrefix()+"GDDBS Exception:", otd);
						message.reply("GGDBS Error: "+otd);
						return;
					}

					let allycodes = [];

					msg = "%d players in DB guild: "+guild.name;
					console.log(logPrefix()+msg, result.length);

					guild.gpAvg = Math.round(guild.gp/result.length);
					msg = "PG: %s; Average PG: "+guild.gpAvg.toLocaleString(locale);
					console.log(logPrefix()+msg, guild.gp.toLocaleString(locale));

					guild.players = {};
					result.forEach(function(player) {
						allycodes.push(player.allycode);
						guild.players[player.allycode] = player;
					});

					guild.relics = 0;
					sql = "SELECT * from `units` WHERE allycode IN (?)"; // get units
					db_pool.query(sql, [allycodes], function(exc, result) {
						if (exc) {
							let otd = exc.sqlMessage? exc.sqlMessage: exc; // obj to display

							console.log("SQL:", sql);
							console.log(logPrefix()+"GDDBS Exception:", otd);
							message.reply("GGDBS Error: "+otd);
							return;
						}

						n = result.length;
						msg = n.toLocaleString(locale)+" matching units found";
						if (!n) {
							console.warn(logPrefix()+msg+"!");
							message.reply("GGDBS Error: " +msg+"!");
							return;
						}

						console.log(logPrefix()+msg);
						result.forEach(function(u) {
							guild.relics += u.relic;

							if(!guild.players[u.allycode].unitsData)
								guild.players[u.allycode].unitsData = {};

							guild.players[u.allycode].unitsData[u.name] = u;
						});

						if (typeof(callback)==="function")
							callback(allycode, message, guild);
					});
				});
			});
		})
		.catch(console.error);
};

exports.getGuildStats = function(player, message, callback) {
	let allycode = player.allycode;

	if (!allycode) {
		message.reply(":red_circle: Invalid or missing allycode!");
		return;
	}

	message.channel.send("Looking for stats of guild with ally: "+allycode+"...")
		.then(msg => {
			swgoh.getPlayerGuild(allycode, message, function(guild) {
				if (typeof(msg.delete)==="function") msg.delete();

				// Remember stats of the guild:
				exports.rememberGuildStats(guild);

				if (typeof(callback)==="function") callback(guild, message, player);
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

	db_pool.query(sql, function(exc, result) {
		if (exc) {
			let otd = exc.sqlMessage? exc.sqlMessage: exc; // obj to display

			console.log("SQL:", sql);
			console.log(logPrefix()+"GLA Exception:", otd);
			return;
		}

		console.log(logPrefix()+"%d evols match allycode:", result.length, allycode);

		view.showLastEvols(player, message, result);
	});
};

exports.getPlayerFromDatabase = function(allycode, message, callback) {
	let logPrefix = exports.logPrefix; // shortcut
	let player = null;
	let sql = "SELECT * FROM `users` WHERE allycode="+parseInt(allycode);

	db_pool.query(sql, function(exc, result) {
		if (exc) {
			console.log("SQL:", sql);
			console.log(logPrefix()+"GPFDB1 Exception:", exc.sqlMessage? exc.sqlMessage: exc);
			message.reply("Failed #1! "+(exc.sqlMessage? exc.sqlMessage: exc));

			return;
		}

		if (result.length!==1)
			console.log(logPrefix()+result.length+" record(s) match(es) allycode:", allycode);

		if ( ! result.length ) {
			console.log(logPrefix()+"User with allycode "+allycode+" not registered.");
			message.channel.send("I don't know this player yet. You may use the 'register' command.");
			player = {game_name: allycode};
		} else {
			player = result[result.length - 1]; // take last match
			console.log(logPrefix()+"Ally w/ code "+allycode+" is:", player.game_name);
		}

		// Get player's units:
		sql = "SELECT * FROM `units` WHERE allycode="+parseInt(allycode);

		db_pool.query(sql, function(exc, result) {
			if (exc) {
				console.log("SQL:", sql);
				console.log(logPrefix()+"GPFDB2 Exception:", exc.sqlMessage? exc.sqlMessage: exc);
				message.reply("Failed #3! "+(exc.sqlMessage? exc.sqlMessage: exc));
				return;
			}

			if (!result.length)
				console.warn(logPrefix()+"GPFDB get %d characters for:", result.length, player.game_name);

			// Add units to the player object:
			player.unitsData = {length: 0};
			result.forEach(function(u) {
				player.unitsData.length++;
				player.unitsData[u.name] = u;
			});

			if (typeof(callback)==="function") callback(player, message);
		});
	});
};

exports.getPlayerFromDiscordUser = function(user, message, callback) {
	let discord_id = user.id;
	let logPrefix = exports.logPrefix; // shortcut
	let sql = "SELECT * FROM `users` WHERE discord_id="+parseInt(discord_id);

	db_pool.query(sql, function(exc, result) {
		if (exc) {
			console.log("SQL:", sql);
			console.log(logPrefix()+"GPFDI Exception:", exc.sqlMessage? exc.sqlMessage: exc);
			return;
		}

		console.log(logPrefix()+result.length+" record(s) match(es) user's ID:", discord_id);
		// console.dir(result);
		if (result.length === 1) {
			let player = result[0];

			player.displayAvatarURL = user.displayAvatarURL;
			console.log(logPrefix()+"Found allycode:", player.allycode);
			// console.log(logPrefix()+"Avatar URL:", user.displayAvatarURL);

			if (typeof(callback)==="function") callback(player);
			return;
		}

		console.log(logPrefix()+"Allycode not found"); // Normal for "self(y)" command
		message.reply("This user has no player ID. You may try: "+config.discord.prefix+"register ally-code");
	});
};

exports.getPlayerStats = function(users, message, callback) {
	let allycodes = [];
	let playersByAllycode = {};

	if (!(users instanceof Array)) users = [users];

	users.forEach(function(user) {
		allycodes.push(user.allycode);
		playersByAllycode[user.allycode] = user;
	});

	if (!allycodes || ["number", "object"].indexOf(typeof(allycodes))<0) {
		message.reply(":red_circle: Invalid or missing allycode(s)! Try 'register' command.");
		return;
	}

	let str = typeof(allycodes)==="number"? allycodes+"'s": allycodes.length+" allycodes";

	message.channel.send("Looking for "+str+" stats...")
		.then(msg => {
			swgoh.getPlayerData(users, message, function(player, message) {
				if (typeof(msg.delete)==="function") msg.delete();

				player.displayAvatarURL =
					playersByAllycode[player.allycode].displayAvatarURL;
				exports.updatePlayerDataInDb(player, message);

				if (typeof(callback)==="function") callback(player, message);
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

				// Remember stats of the guild:
				exports.rememberGuildStats(guild);

				if (!guild.gp) {
					msg = "GUP: invalid guild GP: "+guild.gp;
					console.warn(logPrefix()+msg);
					message.reply(msg);
					return;
				}

				let sql = "SELECT * FROM `users` WHERE allycode IN (?)";
				let allycodes = Object.keys(guild.players);
				let n = allycodes.length;

				console.log(logPrefix()+"GUP: received %d user(s).", n);

				db_pool.query(sql, [allycodes], function(exc, regPlayers) {
					let dbRegByAc = {};
					let msg = "%d registered users out of %d.";
					let nbReg = 0;
					let notRegPlayers = [];

					if (exc) {
						let otd = exc.sqlMessage? exc.sqlMessage: exc; // obj to display

						console.log(logPrefix()+"SQL:", sql);
						console.log(logPrefix()+"GUP Exception:", otd);
						message.reply("Failed!");
						return;
					}

					console.log(logPrefix()+msg, regPlayers.length, n);

					regPlayers.forEach(function(regPlayer) {
						if (guild.players[regPlayer.allycode]) {
							dbRegByAc[regPlayer.allycode] = regPlayer;
							++nbReg;
						}
					});

					n-= nbReg;
					msg = n+" not registered player(s) found in this guild";
					console.log(logPrefix()+msg);

					if (!n) {
						msg = "All "+allycodes.length+
							" players in this guild are registered. :white_check_mark:";
					} else {
						Object.keys(guild.players).forEach(function(allycode, i) {
							if (!dbRegByAc[allycode])
								notRegPlayers.push(guild.players[allycode]+" ("+allycode+")");
						});

						msg = "**"+msg+":** "+notRegPlayers.sort().join(", ")+".";
					}
					message.channel.send(msg);
				});
			});
		})
		.catch(console.error);
};

/** Get top players of a guild contest */
exports.handleContest = function(guild, message, target) {
	let allycodes = Object.keys(guild.players);
	let authorFound = false;
	let targetFound = false;
	let limit = 10;
	let logPrefix = exports.logPrefix; // shortcut
	let readCommands = ['get', 'getrank', 'getscore', 'rank', 'top'];

	let args = message.unparsedArgs;
	let cmd = message.contestCommand;
	let delta = message.contestDelta;

	console.log(logPrefix()+"Contest command:", cmd);

	// Get author's allycode
	exports.getPlayerFromDiscordUser(message.author, message, function(author) {
		let sql = '';

		if (readCommands.indexOf(cmd)<0 || target.allycode!==author.allycode) {
			// SECURITY checks:

			if ( ! author.isContestAdmin ) {
				message.reply("You are NOT a contest admin!");
				return;
			}
			console.log(logPrefix()+author.game_name+" is a contest admin.");

			if (allycodes.length)
				console.log(logPrefix()+"Type of allycodes[0]: "+typeof(allycodes[0])); // string

			if (target.allycode!==author.allycode) {
				// Check if author & target are players from the same guild:
				allycodes.forEach(function(allycode) {
					if (authorFound && targetFound) return;

					allycode = parseInt(allycode); // Convert string to number
					if (allycode === author.allycode) authorFound = true;
					if (allycode === target.allycode) targetFound = true;
				});
				if (!authorFound || !targetFound) {
					console.log(logPrefix()+"Author:\n "+JSON.stringify(author));
					console.log(logPrefix()+"Target:\n "+JSON.stringify(target));
					console.warn(logPrefix()+
						"Author's allycode="+author.allycode+" / target's allycode="+target.allycode);
					console.warn(logPrefix()+
						"Author found="+(authorFound? 'Y': 'N')+" / target found="+(targetFound? 'Y': 'N'));
					message.reply("You are NOT part of the same guild!");
					return;
				}
			}
		}

		if (cmd==='add') {
			sql = "UPDATE `users` SET `contestPoints`=`contestPoints`+? WHERE `allycode`=?";
		} else if (['rem', 'remove'].indexOf(cmd)>=0) {
			sql = "UPDATE `users` SET `contestPoints`=`contestPoints`-? WHERE `allycode`=?";
		} else if (cmd==='set') {
			sql = "UPDATE `users` SET `contestPoints`=? WHERE `allycode`=?";
		}

		if (sql) {
			db_pool.query(sql, [delta, target.allycode], function(exc, result) {
				let logPrefix = exports.logPrefix; // shortcut

				if (exc) {
					let otd = exc.sqlMessage? exc.sqlMessage: exc; // obj to display

					console.log("SQL:", sql);
					console.warn(logPrefix()+"GCT Exception:", otd);
					return;
				}

				msg = result.affectedRows+" user(s) updated";
				console.log(logPrefix()+msg);
				message.reply(msg);
				return;
			});
			return;
		}

		if (readCommands.indexOf(cmd)<0) {
			message.reply('Coming soon...'); // TODO: "reset" support
			console.log(logPrefix()+args.length+" unparsed arg(s):", args.join(' '));
			return;
		}

		let rank = 0;

		if (cmd!=='top') limit = 50;
		sql = "SELECT * FROM `users` WHERE guildRefId=?";
		sql+= " ORDER BY contestPoints DESC LIMIT ?";
		db_pool.query(sql, [guild.refId, limit], function(exc, result) {
			let logPrefix = exports.logPrefix; // shortcut

			if (exc) {
				let otd = exc.sqlMessage? exc.sqlMessage: exc; // obj to display

				console.log("SQL:", sql);
				console.warn(logPrefix()+"GCT Exception:", otd);
				return;
			}

			let color = "GREEN";
			let lastScore = 0;
			let lines = [];

			console.log(logPrefix()+"%d matches found", result.length);
			result.forEach(function(player) {
				if (player.contestPoints!==lastScore) ++rank;
				if (cmd==='top' || player.allycode===target.allycode)
					lines.push(rank+"/ "+player.contestPoints+" pts for: **"+player.game_name+"**");
				lastScore = player.contestPoints;
			});

			console.log(logPrefix()+"%d lines done", lines.length);
			richMsg = new RichEmbed()
				.setTitle("Top "+limit+" of contest for: "+guild.name)
				.setDescription(lines).setColor(color)
				.setTimestamp(author.updated)
				.setFooter(config.footer.message, config.footer.iconUrl);
			message.channel.send(richMsg);
		});
	});
};

exports.logPrefix = function () {
	let dt = new Date();

	return dt.toString().replace(/ GMT.*$$/, "")+" - ";
};

exports.refreshGuildStats = function(allycode, message, callback) {
	let locale = config.discord.locale; // shortcut
	let logPrefix = exports.logPrefix; // shortcut

	if (!allycode) {
		message.reply(":red_circle: Invalid or missing allycode!");
		return;
	}

	let sql = "SELECT * FROM `guilds` g"; // get guild

	sql+= " WHERE swgoh_id IN (SELECT guildRefId from `users` WHERE allycode=?)";

	message.channel.send("Looking for DB stats of guild with ally: "+allycode+"...")
		.then(msg => {
			db_pool.query(sql, [allycode], function(exc, result) {
				if (typeof(msg.delete)==="function") msg.delete();

				if (exc) {
					let otd = exc.sqlMessage? exc.sqlMessage: exc; // obj to display

					console.log("SQL:", sql);
					console.log(logPrefix()+"GDDBS Exception:", otd);
					message.reply("RGS Error: "+otd);
					return;
				}

				// console.log(logPrefix()+"result:", result); // id, swgoh_id, name
				let n = result.length;

				msg = n+" matching guilds found";
				if (n!==1) {
					console.warn(logPrefix()+msg);
					message.reply(msg);
					return;
				}

				let guild = result[0];
				msg = "Matching guild: %s (%s)";
				guild.refId = guild.swgoh_id;
				console.log(logPrefix()+msg, guild.name, guild.refId);

				sql = "SELECT * from `users` WHERE guildRefId=?"; // get players
				db_pool.query(sql, [guild.refId], function(exc, result) {
					if (exc) {
						let otd = exc.sqlMessage? exc.sqlMessage: exc; // obj to display

						console.log("SQL:", sql);
						console.warn(logPrefix()+"GDDBS Exception:", otd);
						message.reply("RGS Error: "+otd);
						return;
					}

					let players = [];

					msg = "%d players in DB guild: "+guild.name;
					console.log(logPrefix()+msg, result.length);

					guild.gpAvg = Math.round(guild.gp/result.length);
					msg = "PG: %s; Average PG: "+guild.gpAvg.toLocaleString(locale);
					console.log(logPrefix()+msg, guild.gp.toLocaleString(locale));

					guild.players = {};
					result.forEach(function(player) {
						players.push(player);
						guild.players[player.allycode] = player;
					});

					exports.getPlayerStats(players, message, callback);
				});
			});
		})
		.catch(console.error);
};

/** Remember stats of the guild */
exports.rememberGuildStats = function(guild) {
	let logPrefix = exports.logPrefix; // shortcut
	let sql = "INSERT INTO `guilds` (swgoh_id, name, gp, memberCount) VALUES ?";
	let values = [[guild.id, guild.name, guild.gp, guild.memberCount]];

	db_pool.query(sql, [values], function(exc, result) {
		if (exc) {
			let otd = exc.sqlMessage? exc.sqlMessage: exc; // obj to display

			console.log("SQL:", sql);
			console.log(logPrefix()+"GS Exception:", otd);

			// Retry with an UPDATE:
			sql = "UPDATE `guilds` SET name=?, gp=?, memberCount=? WHERE swgoh_id=?";
			values = [guild.name, guild.gp, guild.memberCount, guild.id];

			db_pool.query(sql, values, function(exc, result) {
				if (exc) {
					otd = exc.sqlMessage? exc.sqlMessage: exc; // obj to display

					console.log("SQL:", sql);
					console.log(logPrefix()+"GS Exception:", otd);
					message.reply("GS exception: "+otd);
					return;
				}

				let n = result.affectedRows;
				console.log(logPrefix()+"%d guild records updated (UPDATE).", n);
			});
			return;
		}

		let n = result.affectedRows;
		console.log(logPrefix()+"%d guild records updated (DEL+ADD).", n);
	});
};

exports.updatePlayerDataInDb = function(player, message, callback) {
	let allycode = player.allycode;
	let logPrefix = exports.logPrefix; // shortcut

	if (!player.gp) {
		console.log(logPrefix()+"invalid GP for user:", player);
		return;
	}

	// Try to find the same user in the database:
	exports.getPlayerFromDatabase(allycode, message, function(prevPlayerVersion) {
		let lines = [];
		let msg = "";
		let sql = "INSERT INTO `evols` (allycode, unit_id, type, new_value) VALUES ?";

		// If the user was unknown, do no look for any evolution:
		if (prevPlayerVersion && prevPlayerVersion.gp) {
			// Check for evolutions:
			let newUnitCount = 0;
			let nbChars = 0;
			let nbShips = 0;
			let prevUnitsCount = prevPlayerVersion.unitsData.length;

			console.log(logPrefix()+"Old chars count:", prevUnitsCount);
			player.unitsData.forEach(function(u) {
				let prevUnit = prevPlayerVersion.unitsData[u.name];

				msg = "Evolution: "+player.name;

				if (u.combatType===1)
					++nbChars;
				else
					++nbShips;

				// Compare old & new units:
				// Look for new units:
				if (typeof(prevUnit)==="undefined") {
					if (prevUnitsCount) { // New unit:
						++newUnitCount;
						msg += " unlocked "+u.name;
						console.log(logPrefix()+msg);

						lines.push([allycode, u.name, "new", 1]);
					}

					return;
				}

				// Look for new relics:
				if (u.relic>3 && u.relic>prevUnit.relic) {
					msg += "'s "+u.name+" is now R"+u.relic;
					console.log(logPrefix()+msg);

					// Add new evolution in the database ("evols" table):
					lines.push([allycode, u.name, "relic", u.relic]);
				} else 
				// Look for new gears:
				if (u.gear>11 && u.gear>prevUnit.gear) {
					msg += "'s "+u.name+" is now G"+u.gear;
					console.log(logPrefix()+msg);

					// Add new evolution in the database ("evols" table):
					lines.push([allycode, u.name, "gear", u.gear]);
				}

				// Look for new stars:
				if (prevUnit.stars>0 && u.stars>6 && u.stars>prevUnit.stars) {
					msg += "'s "+u.name+" is now "+u.stars+"*";
					console.log(logPrefix()+msg);

					// Add new evolution in the database ("evols" table):
					lines.push([allycode, u.name, "star", u.stars]);
				}

				// Look for new zetas:
				if (u.zetaCount>prevUnit.zetaCount) {
					msg += "'s "+u.name+" has now "+u.zetaCount+" zeta(s)";
					console.log(logPrefix()+msg);

					// Add new evolution in the database ("evols" table):
					lines.push([allycode, u.name, "zeta", u.zetaCount]);
				}
			}); // end of unit loop

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
				if (!u.stars) {
					console.warn(logPrefix()+"Invalid star count for unit:\n ", JSON.stringify(u));
				}
				lines.push(
					[u.allycode, u.name, u.combatType, u.gear, u.gp, u.relic, u.stars, u.zetaCount]
				);
			}); // end of unit loop

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

// vim: noexpandtab shiftwidth=4 softtabstop=4 tabstop=4
