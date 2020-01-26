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

// Get the configuration from a separated JSON file:
const config = require("./config.json");

// Remember when this program started:
//const start = Date();

// Database connection:
//const mysql = require("mysql");

// Load other module(s):
const locutus = require("./locutus"); // Functions from locutus.io
const tools   = require("./tools");   // Several functions
const swgoh   = require("./swgoh");   // SWGoH API
//const view  = require("./view");    // Functions used to display results

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
		msg = "GPS: Invalid guild: "+JSON.stringify(guild); // TODO: fix this
		console.warn(logPrefix()+msg);
		message.reply(msg);
		return;
	}

	richMsg = new RichEmbed().setTitle(guild.name);

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
	// lines.push("``##/  avg  /  max``");

	// Compute statitics:
	config.custom.unitsOfInterest.forEach(function(unitName) {
		let cpg = {}; // count per gears
		let cpr = {}; // count per relics
		let cps = {}; // count per stars
		let ct = 0;
		let stat = {count: 0, gp: 0, gpMin: 999999, gpAvg: 0, gpMax: 0};
		let uc = 0;
		let unitKey = unitName.replace(/ /g, '').toUpperCase();

		console.log(logPrefix()+"Fetching for: %s (%s)...", unitName, unitKey);

		allycodes.forEach(function(allycode, i) {
			let player = players[allycode];
			if (!player) {
				console.warn(logPrefix()+"Did not find player with allycode: "+allycode);
				return;
			}

			let u = player.unitsData[unitKey];
			if (!u) return;

			ct = u.combatType;
			if (u.ct<2 && u.stars<toonMinStars) return;
			if (u.ct>1 && u.stars<shipMinStars) return;

			uc++;
			stat.count++;
			stat.gp += u.gp;
			if (u.gp>stat.gpMax) stat.gpMax = u.gp;
			if (u.gp<stat.gpMin) stat.gpMin = u.gp;

			if (!cpg[u.gear ]) cpg[u.gear ] = 1; else cpg[u.gear ]++;
			if (!cps[u.stars]) cps[u.stars] = 1; else cps[u.stars]++;
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

		let icon = ct>1? ":rocket:": ":man_standing:";

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
			unitName = unitName.replace('Brood ', '');
			richMsg.addField(icon+" "+uc+" "+unitName, "``"+statStr+"``", true);
		}
	});

	richMsg.setColor("GREEN").setDescription(lines).setTimestamp(guild.updated)
		.setFooter(config.footer.message, config.footer.iconUrl);

	// Display the result:
	message.reply(richMsg);
};

exports.logPrefix = function () {
	let dt = new Date();

	return dt.toString().replace(/ GMT.*$$/, "")+" - ";
};

exports.showGuildStats = function(guild, message) {
	let locale = config.discord.locale; // shortcut
	let logPrefix = exports.logPrefix; // shortcut

	if (!guild.gp) {
		msg = "GGS: Invalid guild GP: "+guild.gp;
		console.warn(logPrefix()+msg);
		message.reply(msg);
		return;
	}

	richMsg = new RichEmbed().setTitle(guild.name).setColor("GREEN")
		// .setAuthor(config.discord.username)
		.setDescription([
			"**Guild description:** "+guild.desc,
			"**Officers ("+guild.officerNames.length+"):** "+
				guild.officerNames.sort().join(", ")
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

	if (guild.required)
		richMsg.addField("Required level:", "≥ "+guild.required, true)

	if (guild.message)
		richMsg.addField("Yellow banner:", guild.message, true)

	message.reply(richMsg);
};

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

	if (!player.gp) {
		console.log(logPrefix()+"invalid GP for user:", player);
		return;
	}

	console.log(logPrefix()+"Name to look for: '%s'", strToLookFor);
	pattern = new RegExp("^"+strToLookFor);
	if (!ct) ct = 1; // combatType: 1 for characters / 2 for ships

	// Try exact match...
	player.unitsData.forEach(function(unit) {
		if (unit.combatType===ct && unit.name===strToLookFor) {
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
		}
	}

	color = nbFound===1? "GREEN": "ORANGE";
	let richMsg = new RichEmbed().setTimestamp(player.updated).setColor(color)
		.setFooter(config.footer.message, config.footer.iconUrl);

	unitName = locutus.ucwords(unitName);
	msg = nbFound+" units with '"+unitName+"' found in this roster";
	console.log(logPrefix()+msg);
	if (nbFound!==1) {
		lines = [msg+"!"];
		if (nbFound) lines.push("Matching names: "+matchingNames.join(', '));
		richMsg.setDescription(lines).setTitle(player.name+"'s "+unitName);
		message.reply(richMsg);
		return;
	}

	richMsg.setThumbnail("https://swgoh.gg/game-asset/u/"+foundUnit.name+"/")
		.setTitle(player.name+"'s "+unitName+" ("+foundUnit.name+")");

	// Start with stars:
	key = 'stars';
	val = foundUnit[key];
	key+= " ("+val+")";
	val = ":star:".repeat(val) + ":low_brightness:".repeat(7-val);
	val = "**"+locutus.ucfirst(key)+":** "+val;
	lines.push(val);

	// Continue with others keys:
	Object.keys(foundUnit).sort(function(a, b){return b-a}).forEach(function(key) {
		var val = foundUnit[key];

		if (hiddenFields.indexOf(key)<0) {
			switch(key) {
				case "gp":
					key = "GP";
					val = val.toLocaleString();
					break;

				case "mods":
					if (ct===2) return; // ignore for ships
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
					msg+= " unlocked";
					break;
				case "relic":
					msg+= " turned R"+e.new_value;
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
				lines.push("`"+msg+"`");
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

	let su = n===1? '': 's';
	let sr = tprc===1? '': 's';

	lines.push("**Total:** "+tprc+" relic"+sr);
	richMsg = new RichEmbed()
		.setTitle(player.name+" has "+n+" unit"+su+" with relics:")
		.setDescription(lines).setColor(color)
		.setTimestamp(player.updated)
		.setFooter(config.footer.message, config.footer.iconUrl);
	message.channel.send(richMsg);
};

exports.showPlayerStats = function(player, message) {
	let locale = config.discord.locale; // shortcut
	let logPrefix = exports.logPrefix; // shortcut

	if (!player.gp) {
		console.log(logPrefix()+"invalid GP for user:", player);
		return;
	}

	let richMsg = new RichEmbed().setTitle(player.name+"'s profile").setColor("GREEN")
		.setDescription([
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
		])
		.setTimestamp(player.updated)
		.setFooter(config.footer.message, config.footer.iconUrl);
	if (player.displayAvatarURL) richMsg.setThumbnail(player.displayAvatarURL);
	message.reply(richMsg);
};

exports.showWhoIs = function(user, nick, message) {
	let lines = [
			"**"+nick+" ID is:** "+user.id,
			"**"+nick+" creation date is:**", " "+user.createdAt,
			"**"+nick+" presence status is:** "+user.presence.status
		];
	let logPrefix = exports.logPrefix; // shortcut

	tools.getPlayerFromDiscordId(user, message, function(player) {
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

// vim: noexpandtab shiftwidth=4 softtabstop=4 tabstop=4
