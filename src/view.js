/**
 * view.js is the display module for Juke's SWGoH Discord bot
 * @author PixEye@pixeye.net
 * @since 2020-01-08
 */

// jshint esversion: 8

// Extract the required classes from the discord.js module:
const { RichEmbed } = require("discord.js");

// Create an instance of a Discord client:
//const client = new Client();

// Remember when this program started:
//const start = Date();

// Database connection:
//const mysql = require("mysql");

// Load other module(s):
const locutus = require("./locutus"); // Functions from locutus.io
const tools   = require("./tools");  // Several functions
//nst swgoh   = require("./swgoh"); // SWGoH API of this bot
//nst view    = require("./view"); // Functions used to display results (self file)

// Get the configuration & its template from a separated JSON files:
let config = require("./config.json");
// let tplCfg = require("./config-template.json");

const unitRealNames  = require("../data/unit-names");
const unitAliasNames = require("../data/unit-aliases");

/** List guild members
 * @param {Number} allycode - An allycode
 * @param {Object} message - The user's message to reply to
 * @param {Object} guild - The user's guild
 */
exports.guildPlayerStats = function(allycode, message, guild) {
	let allycodes = [allycode];
	let line = '';
	let lines = [];
	let locale = config.discord.locale; // shortcut
	let logPrefix = exports.logPrefix; // shortcut
	let players = {};
	let shipMinStars = config.custom.shipMinStars;
	let toonMinStars = config.custom.toonMinStars;

	if (!guild || !guild.players || typeof(guild.players)!=="object") {
		let msg = "GPS: Invalid guild: "+JSON.stringify(guild); // TODO: fix this
		console.warn(logPrefix()+msg);
		message.reply(msg);
		return;
	}

	let richMsg = new RichEmbed().setTitle(guild.name);

	allycodes = Object.keys(guild.players);
	console.log(logPrefix()+"%d players to get...", allycodes.length);

	players = guild.players;
	console.log(logPrefix()+"Got %d players' data.", Object.keys(players).length);

	line = "**GP:** "+guild.gp.toLocaleString(locale)+"; ";
	line+= "**Known members:** "+Object.keys(guild.players).length;
	line+= "/"+guild.memberCount;
	lines.push(line);

	// line.push("**Total relics:** "+guild.relics);
	line = "Toons <"+toonMinStars+":star: & ships <"+shipMinStars+":star: are ignored.";
	lines.push(line);
	// lines.push("`##/  avg  /  max`");

	// Compute statitics:
	config.custom.unitsOfInterest.forEach(function(unitName) {
		let cpg = {}; // count per gears
		let cpr = {}; // count per relics
		let cps = {}; // count per stars
		let ct = 0;
		let stat = {count: 0, gp: 0, gpMin: 999999, gpAvg: 0, gpMax: 0};
		let uc = 0;
		let unitKey = unitName.replace(/ /g, '').toUpperCase();

		unitName = unitName.replace('Brood ', '');
		unitName = unitName.replace('Capital ', '');
		unitName = unitName.replace('Jedi Knight ', 'JK');
		unitName = unitName.replace('Supreme Leader Kylo Ren', 'SLKR');
		console.log(logPrefix()+"Fetching for: %s (%s)...", unitName, unitKey);

		allycodes.forEach(function(allycode) {
			let player = players[allycode];
			if (!player) {
				console.warn(logPrefix()+"Did not find player with allycode: "+allycode);
				return;
			}

			let u = player.unitsData[unitKey];
			if (!u) return;

			ct = u.combatType;
			if ((u.ct<2 && u.stars<toonMinStars) || (u.ct>1 && u.stars<shipMinStars))
				return;

			uc++;
			stat.count++;
			stat.gp += u.gp;
			if (u.gp>stat.gpMax) stat.gpMax = u.gp;
			if (u.gp<stat.gpMin) stat.gpMin = u.gp;

			if (!cpg[u.gear ]) cpg[u.gear ] = 1; else cpg[u.gear ]++;
			if (u.stars<5) return;
			if (!cps[u.stars]) cps[u.stars] = 1; else cps[u.stars]++;
			if (u.relic<4) return;
			if (!cpr[u.relic]) cpr[u.relic] = 1; else cpr[u.relic]++;
		});

		stat.gpAvg = stat.count? Math.round(stat.gp / stat.count): 0;
		if (ct<2) {
			console.log(logPrefix()+"Count per relic:", cpr);
			console.log(logPrefix()+"Count per stars:", cps);
		}

		delete stat.gp;
		delete stat.gpMin;

		let statStr = [];
		Object.keys(stat).forEach(function(k) {
			let v = stat[k], val = v;

			if (k==="count")
				val = v<10? "0"+v: v;
			else
			if (typeof(v)==="number")
				val = v<10000? " "+v.toLocaleString(locale): v.toLocaleString(locale);

			statStr.push(val);
		});

		let icon = ct>1? ":rocket:": ":fencer:"; // was: ":man_standing:";

		if (stat.count) {
			statStr = statStr.join("/ ");
			stat = [];
			statStr = '';
			Object.keys(cps).forEach(function(stars) {
				let cnt = cps[stars];
				if (cnt) stat.push(cnt+" "+stars+"*");
			});
			if (ct<2) {
				Object.keys(cpr).forEach(function(relics) {
					let cnt = cpr[relics];
					if (cnt && parseInt(relics)) stat.push(cnt+" R"+relics);
				});
			}
			statStr = stat.join("; ");
			if (statStr) {
				richMsg.addField(icon+" "+uc+" "+unitName, "`"+statStr+"`", true);
			}
		}
	});

	richMsg.setColor("GREEN").setDescription(lines).setTimestamp(guild.updated)
		.setFooter(config.footer.message, config.footer.iconUrl);

	// Display the result:
	message.reply(richMsg).catch(function(ex) {
		console.warn(ex);
		message.reply(ex.message);
		message.channel.send(lines);
	});
};

/** List guild members (LGM command)
 * @param {Number} allycode - An allycode
 * @param {Object} message - The user's message to reply to
 * @param {Object} guild - The user's guild
 */
exports.listGuildMembers = function(allycode, message, guild) {
	let logPrefix = exports.logPrefix; // shortcut
	let msg = "";

	if (!allycode) {
		message.reply(":red_circle: Invalid or missing allycode!");
		return;
	}

	if (!guild.gp) {
		msg = "LGM: invalid guild GP: "+guild.gp;
		console.warn(logPrefix()+msg);
		message.reply(msg);
		return;
	}

	let allycodes = Object.keys(guild.players);
	let dbRegByAc = {};
	let listToDisplay = [];
	let n = allycodes.length;
	let regPlayers = Object.values(guild.players);
	let nbReg = regPlayers.length;

	console.log(logPrefix()+"LGM: found %d user(s).", nbReg);

	msg = "%d registered users out of %d.";
	console.log(logPrefix()+msg, regPlayers.length, n);

	regPlayers.forEach(function(regPlayer) {
		if (guild.players[regPlayer.allycode]) {
			dbRegByAc[regPlayer.allycode] = regPlayer;
		}
	});

	msg = (n-nbReg)+" not registered player(s) found in this guild";
	console.log(logPrefix()+msg);

	if (!nbReg) {
		msg = "No players in this guild are registered! (see GUP command)";
	} else {
		msg = nbReg+" registered player(s) found in this guild";
		Object.keys(guild.players).forEach(function(allycode) {
			listToDisplay.push(guild.players[allycode].game_name+" ("+allycode+")");
		});

		msg = "**"+msg+":** "+listToDisplay.sort().join(", ")+".";
	}
	message.channel.send(msg);
};

exports.logPrefix = function () {
	let dt = new Date();

	return dt.toString().replace(/ GMT.*$$/, "")+" - ";
};

/** Show known abbreviations / acronyms
 * @param {Object} message - The user's message to reply to
 */
exports.showAbbr = function(message) {
	let buffer = '';
	let chunkSize = 20;
	let i = 0;
	let lines = [];
	let logPrefix = exports.logPrefix; // shortcut
	let nbAliases = Object.keys(unitAliasNames).length;
	let nbMsgSent = 0;
	let newAlias = '';
	let now = new Date();
	let richMsg = new RichEmbed().setColor("GREEN")
		.setTimestamp(now).setFooter(config.footer.message, config.footer.iconUrl);

	console.log(logPrefix() + "showAbbr() called to show: " + nbAliases + " aliases.")

	Object.keys(unitAliasNames).sort().forEach(alias => {
		newAlias = alias + ': ' + unitRealNames[unitAliasNames[alias]];
		if (buffer==='') {
			buffer = newAlias;
		} else {
			lines.push(buffer + ' / ' + newAlias);
			buffer = '';
		}

		if (i && i % chunkSize === 0) {
			richMsg.setDescription(lines).setTitle(i + "/" + nbAliases + " known abbreviations");
			message.channel.send(richMsg).catch(function(ex) {
				console.warn(ex);
				// message.reply(ex.message);
				message.channel.send(lines);
			});
			++nbMsgSent;
			lines = [];
		}
		++i;
	});

	if (lines.length) {
		richMsg.setDescription(lines).setTitle(i + "/" + nbAliases + " known abbreviations");
		message.channel.send(richMsg).catch(function(ex) {
			console.warn(ex);
			message.reply(ex.message);
			message.channel.send(lines);
		});
		++nbMsgSent;
	}

	console.log(logPrefix() + "\\ showAbbr(): " + nbMsgSent + " messages sent.")
};

/** Show guild statistics (GS command)
 * @param {Object} guild - The user's guild
 * @param {Object} message - The user's message to reply to
 */
exports.showGuildStats = function(guild, message) {
	let locale = config.discord.locale; // shortcut
	let logPrefix = exports.logPrefix; // shortcut
	let msg = "";

	if (!guild.gp) {
		msg = "GGS: Invalid guild GP: "+guild.gp;
		console.warn(logPrefix()+msg);
		message.reply(msg);
		return;
	}

	let richMsg = new RichEmbed().setTitle(guild.name).setColor("GREEN")
		// .setAuthor(config.discord.username)
		.setDescription([
			"**Guild description:** "+guild.desc,
			"**Officers ("+guild.officerNames.length+"):** "+
				guild.officerNames.sort(tools.stringsCompare).join(", ")
		])
		.addField("GP:", guild.gp.toLocaleString(locale), true)
		.addField("Toon GP:", guild.gpChar.toLocaleString(locale), true)
		.addField("Ship GP:", guild.gpShip.toLocaleString(locale), true)
		.addField("Member count:", guild.memberCount, true)
		.addField("GP average:",
			Math.round(guild.gp/guild.memberCount).toLocaleString(locale), true)
		.addField("Leader:", guild.leader.name+
			" (GP: "+ guild.leader.gp.toLocaleString(locale)+")", true)
		.addField("Biggest GP:", guild.biggestPlayer.name+
			" (GP: "+guild.biggestPlayer.gp.toLocaleString(locale)+")", true)
		.setTimestamp(guild.updated)
		.setFooter(config.footer.message, config.footer.iconUrl);

	if (guild.bannerLogo) {
		richMsg.setThumbnail("https://swgoh.gg/static/img/assets/tex."+guild.bannerLogo+".png");
	}

	if (guild.required) {
		richMsg.addField("Required level:", "≥ "+guild.required, true)
	}

	if (guild.message) {
		richMsg.addField("Yellow banner:", guild.message, true)
	}

	message.reply(richMsg).catch(function(ex) {
		console.warn(ex);
		message.reply(ex.message);
	});
};

/** Show player's last evolutions (LE command)
 * @param {Object} player - The user's profile as an object
 * @param {Object} message - The user's message to reply to
 * @param {Object} evols - Player's evolutions (array of objects)
 */
exports.showLastEvols = function(player, message, evols) {
	let color = "GREEN";
	let lines = [];
	let maxDays = 10;
	let maxDt = 0;
	let maxLines = 10;
	let maxPeriod = 24 * 3600 * 1000 * maxDays;
	let n = 0;
	let now = new Date();
	let lastEvols = evols.filter(function(evol) {
		if (typeof(evol.ts)==="string") {
			evol.ts = new Date(); // was: (evol.ts)
			++n;
		}
		return (now.getTime() - evol.ts)<maxPeriod;
	});
	let logPrefix = exports.logPrefix; // shortcut

	if (n) {
		console.warn(logPrefix()+"Had to transform %d string(s) to date(s)", n);
	}

	n = lastEvols.length;
	console.log(logPrefix()+"%d evol(s) found.", n);
	// console.dir(player.unitsData);

	if (n === 0) {
		let msg = "";

		color = "ORANGE";
		msg = "No evolution registered in this roster for the last "+maxDays+" days";
		console.log(logPrefix()+msg);
		message.channel.send(msg+".");
		return;
	}

	lastEvols.forEach(function(e, i) {
		let dt = e.ts.toString() // take timestamp from evolution e
			.replace(/ \(.*\)$/, "")  // remove useless duplicated time zone in parentheses
			.replace(/:\d\d /, " ")  // remove seconds
			.replace(/ \d{4}/, "")  // remove the year
			.replace(/^.{4}/, ""); // remove day of week
		let msg = "`"+dt+":` ";
		let uid = e.unit_id;

		msg += unitRealNames[uid] || uid;
		maxDt = (e.ts>maxDt)? e.ts: maxDt;

		switch(e.type) {
			case "gear":
				msg+= " :arrow_right: G"+e.new_value;
				break;
			case "new":
				msg+= " :unlock:";
				break;
			case "newGifts":
				msg = "`"+dt+":` player gave "+e.new_value+" :gift:";
				break;
			case "relic":
				msg+= " :arrow_right: R"+e.new_value;
				break;
			case "star":
				msg+= " :arrow_right: "+e.new_value+":star:";
				break;
			case "zeta":
				msg+= " get "+e.type+" #"+e.new_value;
				break;
			default:
				msg+= " :arrow_right: "+e.type+" to: "+e.new_value;
				console.warn("Unexpected evolution type '%s' at ID %d", e.type, e.id);
		}

		if (i<maxLines) {
			lines.push(msg);
		} else if (i===maxLines) {
			lines.push("And some more...");
		}
	});

	if (!maxDt) maxDt = message.createdTimestamp;
	else maxDt = new Date(maxDt);

	let richMsg = new RichEmbed()
		.setTitle(player.name+"'s "+n+" evolution(s) in the last "+maxDays+" days")
		.setDescription(lines).setColor(color).setTimestamp(player.ts)
		.setFooter(config.footer.message, config.footer.iconUrl);

	message.channel.send(richMsg).catch(function(ex) {
		console.warn(ex);
		message.reply(ex.message);
		message.channel.send(lines);
	});
};

/** Show player's relics (relics command)
 * @param {Object} player - The user's profile as an object
 * @param {Object} message - The user's message to reply to
 */
exports.showPlayerRelics = function(player, message) {
	let logPrefix = exports.logPrefix; // shortcut
	let maxLines = 10;

	if (!player.name) {
		console.log(logPrefix()+"invalid name at V50 for user:", player);
		return;
	}

	let color = "GREEN";
	let lines = [];
	let msg = "";
	let n = 0;
	let unitsWithRelics = player.unitsData.filter(unit => unit.relic>0) // main filter
		.sort((a, b) =>
			(b.relic-a.relic)*1e9 + // sort by relic count (descending)
			(b.zetaCount-a.zetaCount)*1e8 + // sort by zeta counts (descending)
			(b.gp-a.gp) // sort by zeta counts (descending)
		);
	let tprc = 0; // total player's relic count

	n = unitsWithRelics.length;
	console.log(logPrefix()+"%d unit(s) with relic found.", n);
	// console.dir(player.unitsData);

	if (n === 0) {
		color = "ORANGE";
		console.log(logPrefix()+"There is 0 known relics in this roster.");
		lines = ["I don't know any relic in this roster for the moment."];
	} else {
		unitsWithRelics.forEach(function(unit, i) {
			tprc += unit.relic;
			if (i<maxLines) {
				let uid = unit.name;

				uid = unitRealNames[uid] || uid;
				msg = "`R"+unit.relic+", "+unit.zetaCount+"z & GP="+unit.gp+"` on: "+uid;
				lines.push(msg);
			} else if (i===maxLines)
				lines.push("And "+(n-maxLines)+" more...");
		});
		console.log(logPrefix()+"%d total relic(s) found.", tprc);
	}

	let su = n===1? '': 's';
	let sr = tprc===1? '': 's';

	lines.push("**Total:** "+tprc+" relic"+sr);
	let richMsg = new RichEmbed()
		.setTitle(player.name+" has "+n+" unit"+su+" with relics:")
		.setDescription(lines).setColor(color)
		.setTimestamp(player.updated)
		.setFooter(config.footer.message, config.footer.iconUrl);
	message.channel.send(richMsg).catch(function(ex) {
		console.warn(ex);
		message.reply(ex.message);
		message.channel.send(lines);
	});
};

/** Show player's statistics (PS command)
 * @param {Object} player - The user's profile as an object
 * @param {Object} message - The user's message to reply to
 */
exports.showPlayerStats = function(player, message) {
	let lines = [];
	let logPrefix = exports.logPrefix; // shortcut

	if (!player.name) {
		console.log(logPrefix()+"invalid name at V55 for user:", player);
		return;
	}

	lines = [
		"**Level:** "+player.level+" - "+
		"**GP:** "+(player.gp.toLocaleString(config.discord.locale)),
		"**Title:** "+locutus.ucwords(player.title.toLowerCase()),
		"**Guild name:** "+player.guildName,
		"",
		"**Zeta count:** "+player.zetaCount+" - "+
		"**G13 count:** "+player.g13Count,
		"**G12 count:** "+player.g12Count+" - "+
		"**G11 count:** "+player.g11Count,
		"",
		"**Ground arena rank:** "+player.arena.char.rank+" - "+
		"**Ship rank:** "+player.arena.ship.rank,
		"",
		"**Number of chars:** "+player.charCount+" - "+
		"**Number of ships:** "+player.shipCount,
		"**Total number of unlocked units:** "+player.unitCount
	];

	if (player.guildMemberLevel===3) lines.unshift('**Role:** :cop: officer');
	if (player.guildMemberLevel===4) lines.unshift('**Role:** :crown: leader');

	if (player.giftCount)
		lines.push("**Gift count:** "+(player.giftCount.toLocaleString(config.discord.locale)));

	let richMsg = new RichEmbed().setTitle(player.name+"'s profile").setColor("GREEN")
		.setDescription(lines).setTimestamp(player.updated)
		.setFooter(config.footer.message, config.footer.iconUrl);

	if (player.displayAvatarURL) {
		richMsg.setThumbnail(player.displayAvatarURL);
	}

	message.reply(richMsg).catch(function(ex) {
		console.warn(ex);
		message.reply(ex.message);
		message.channel.send(lines);
	});
};

/** Show a player's random team (RAND command)
 * @param {Object} player - The user's profile as an object
 * @param {Object} message - The user's message to reply to
 */
exports.showRandomTeam = function(player, message) {
	let lines = [];
	let logPrefix = exports.logPrefix; // shortcut

	if (!player.name) {
		console.log(logPrefix()+"invalid name at V55 for user:", player);
		return;
	}

	lines = [
		"TODO"
	];

	let richMsg = new RichEmbed().setTitle(player.name+"'s profile").setColor("GREEN")
		.setDescription(lines).setTimestamp(player.updated)
		.setFooter(config.footer.message, config.footer.iconUrl);

	if (player.displayAvatarURL) {
		richMsg.setThumbnail(player.displayAvatarURL);
	}

	message.reply(richMsg).catch(function(ex) {
		console.warn(ex);
		message.reply(ex.message);
		message.channel.send(lines);
	});
};

/** Show SWGoH data (fetch command)
 * @param {Object} data - The fetched data
 * @param {Object} message - The user's message to reply to
 */
exports.showSwgohData = function(data, message) {
	let now = new Date();
	let showableData = typeof(data)==="object"?
		JSON.stringify(data).substr(0, 200): data;

	let richMsg = new RichEmbed().setTitle("SWGoH data").setColor("GREEN")
		// .setAuthor(config.discord.username)
		.setDescription(showableData)
		.setTimestamp(typeof(data)==="object" && data.updated? data.updated: now)
		.setFooter(config.footer.message, config.footer.iconUrl);

	message.reply(richMsg).catch(function(ex) {
		console.warn(ex);
		message.reply(ex.message);
		message.channel.send(showableData);
	});
};

/** Show information about a specified unit (CI/SI commands)
 * @param {Object} player - The user's profile as an object
 * @param {Object} message - The user's message to reply to
 * @param {String} unitName - The unit name as one or several word(s)
 * @param {Number} ct - Combat type: 1 for characters & 2 for ships
 */
exports.showUnitInfo = function(player, message, unitName, ct) {
	let color = "RED";
	let foundUnit = null;
	let hiddenFields = ["allycode", "combatType", "name"];
	let lines = [];
	let logPrefix = exports.logPrefix; // shortcut
	let matchingNames = [];
	let msg = "";
	let nbFound = 0;
	let pattern = null;
	let strToLookFor = unitName.replace(/ /g, "").replace(/-/g, '_').toUpperCase();

	if (!player.name) {
		console.log(logPrefix()+"invalid name at V29 for user:", player);
		return;
	}

	console.log(logPrefix()+"Name to look for: '%s'", strToLookFor);
	pattern = new RegExp("^"+strToLookFor);
	if (!ct) ct = 1; // combatType: 1 for characters / 2 for ships

	player.unitsData.forEach(function(unit) {
		if (unit.combatType!==ct) return;

		if (unit.name===strToLookFor) { // Try exact match...
			matchingNames.push(unit.name);
			if (!nbFound) foundUnit = unit;
			++nbFound;
		} else if (unitAliasNames[strToLookFor]===unit.name) { // Try: aliases...
			matchingNames.push(unit.name);
			if (!nbFound) foundUnit = unit;
			++nbFound;
		}
	});

	if (!nbFound) {
		// Try: starts with...
		player.unitsData.forEach(function(unit) {
			if (unit.combatType===ct && unit.name.match(pattern)) {
				matchingNames.push(unit.name);
				if (!nbFound) foundUnit = unit;
				++nbFound;
			}
		});

		if (!nbFound) {
			// Try: contains...
			player.unitsData.forEach(function(unit) {
				if (unit.combatType===ct && unit.name.indexOf(strToLookFor)>=0) {
					matchingNames.push(unit.name);
					if (!nbFound) foundUnit = unit;
					++nbFound;
				}
			});

			if (!nbFound) {
				// Tryin full unit names...
				player.unitsData.forEach(function(unit) {
					let uid = unit.name;
					let fullName = unitRealNames[uid] || uid;

					fullName = fullName.toUpperCase().replace(/ /g, '');
					if (unit.combatType===ct && fullName.indexOf(strToLookFor)>=0) {
						matchingNames.push(uid);
						if (!nbFound) foundUnit = unit;
						++nbFound;
					}
				});
			}
		}
	}

	color = nbFound===1? "GREEN": "ORANGE";
	let richMsg = new RichEmbed().setTimestamp(player.updated).setColor(color)
		.setFooter(config.footer.message, config.footer.iconUrl);

	unitName = locutus.ucwords(unitName);
	msg = nbFound+" units with '"+unitName+"' found in this roster";
	console.log(logPrefix()+msg);
	if (nbFound!==1) {
		let addon = '';
		let maxUnitsToShow = 10;

		lines = [msg+"!"];
		if (nbFound>maxUnitsToShow) { // security: limit the units to show
			tools.arrayShuffle(matchingNames);
			matchingNames = matchingNames.slice(0, maxUnitsToShow);
			addon = matchingNames.length+" shown/";
		}
		if (nbFound) {
			lines.push("**"+addon+nbFound+" total matching names:**");
			matchingNames.sort();
			matchingNames.forEach(function(matchingName, i) {
				i = (i+1<=9 && nbFound>9)? "0"+(i+1): i+1;
				matchingName = unitRealNames[matchingName] || matchingName;
				lines.push("`"+i+"/ "+matchingName+"`");
			});
		}
		richMsg.setDescription(lines).setTitle(player.name+"'s "+unitName);
		message.reply(richMsg).catch(function(ex) {
			console.warn(ex);
			message.reply(ex.message);
			message.channel.send(lines);
		});
		return;
	}

	unitName = foundUnit.name;
	unitName = unitRealNames[unitName] || unitName;
	richMsg.setThumbnail("https://swgoh.gg/game-asset/u/"+foundUnit.name+"/")
		.setTitle(player.name+"'s "+unitName);

	// Start with stars:
	let key = 'stars';
	let val = foundUnit[key];
	key+= " ("+val+")";
	val = ":star:".repeat(val) + ":low_brightness:".repeat(7-val);
	val = "**"+locutus.ucfirst(key)+":** "+val;
	lines.push(val);

	// Continue with others keys:
	Object.keys(foundUnit).sort((a, b) => b-a).forEach(function(key) {
		var val = foundUnit[key];

		if (hiddenFields.indexOf(key)<0) {
			switch(key) {
				case "gp":
					key = "GP";
					val = val.toLocaleString();
					break;

				case "mods":
					if (ct===2) return; // ignore for ships

					// console.log("Modules:", val); // verbose!
					val = val.length;
					break;

				case "stars":
					return; // already done at first line

				case "gear":
				case "relic":
					if (ct===2) return; // ignore for ships
					break;

				case "zetaCount":
					if (ct===2) return; // ignore for ships
					key = "zeta";
					break;
			}

			// richMsg.addField(locutus.ucfirst(key)+":", val, true);
			val = "**"+locutus.ucfirst(key)+":** "+val;
			if (lines.length && lines[lines.length-1].length<30)
				lines[lines.length-1] += " ; "+val;
			else
				lines.push(val);
		}
	});

	// Build the message & show it:
	if (lines.length) richMsg.setDescription(lines);
	message.channel.send(richMsg).catch(function(ex) {
		console.warn(ex);
		message.reply(ex.message);
		message.channel.send(lines);
	});
};

/** Show Discord user's profile (whois command)
 * @param {Object} user - The Discord user's profile as an object
 * @param {String} nick - The Discord user's nickname
 * @param {Object} message - The user's message to reply to
 */
exports.showWhoIs = function(user, nick, message) {
	let availability = user.presence.status.toUpperCase(); // DND, ONLINE, OFFLINE, ... (lowercase at first)
	let lines = [
			"**Discord ID:** "+user.id,
			"**Creation date:** "+user.createdAt.toDateString(),
			"**Status:** "+availability
		];

	tools.getPlayerFromDiscordUser(user, message, function(player) {
		if (player) {
			lines.push("**Allycode:** "+tools.cleanAc(player.allycode));
		}
		if (user.presence.game && user.presence.game.name) {
			lines.push("**Activity:** "+user.presence.game.name);
		}
		let richMsg = new RichEmbed()
			.setTitle(nick+"'s Discord profile").setColor("GREEN")
			.setThumbnail(user.displayAvatarURL).setDescription(lines)
			.setTimestamp(message.createdTimestamp)
			.setFooter(config.footer.message, config.footer.iconUrl);
		message.channel.send(richMsg).catch(function(ex) {
			console.warn(ex);
			message.reply(ex.message);
			message.channel.send(lines);
		});
	});
};

// vim: noexpandtab shiftwidth=4 softtabstop=4 tabstop=4
