/**
 * swgoh.js is SWGoH module for Juke's SWGoH Discord bot
 * @author PixEye@pixeye.net
 * @since  2019-10-29
 */

// jshint esversion: 8

// Get the configuration from a separated JSON file:
const config = require("./config.json");

// Load my other modules:
const tools = require("./tools"); // My functions

// SWGoH API connection:
const ApiSwgohHelp = require("api-swgoh-help");
const swapi = new ApiSwgohHelp({
	"username": config.swapi.user,
	"password": config.swapi.pwd
});

// Extract the required classes from the discord.js module:
const { RichEmbed } = require("discord.js");

// Shortcut(s):
let logPrefix = tools.logPrefix;

exports.getPlayerData = async function getPlayerData(allycode, message, callback) {
	try {
		// let acquiredToken = await swapi.connect();
		// console.log(logPrefix()+"Token: ", acquiredToken);

		let payload  = { "allycodes": [allycode] };
		let { result, error, warning } = await swapi.fetchPlayer(payload);
		let richMsg = null;
		let roster = null;
		let stats  = null;

		if (warning) {
			if (warning.error && warning.error===warning.message) delete warning.error;
			console.log(logPrefix()+"MyWARN: ", warning);
			message.channel.send(warning.message);
		}

		if (error) {
			if (error.error && error.error===error.message) delete error.error;
			console.log(logPrefix()+"My ERR: ", error);
			throw error.message;
		}

		if (result) {
			let player = result[0];

			roster = player.roster;
			stats  = player.stats;

			/*
			player.portraits = "departed"; // { selected: string, unlocked: [strings] }
			player.roster    = "departed"; // array
			player.stats     = "departed"; // array
			player.titles    = "departed"; // { selected: string, unlocked: [strings] }
			console.log(logPrefix()+"Player:");
			console.dir(player); // */

			// console.log("-----");
			// console.log("First unit of the player's roster:");
			// console.dir(roster[0]);
			// id (random string), defId 'MAGMATROOPER', nameKey 'UNIT_MAGMATROOPER_NAME',
			// rarity (7), level (85), xp (int: 883025), gear (8), combatType (1)
			// Array: equipped
			// { equipmentId: '064', slot: 0, nameKey: 'EQUIPMENT_064_NAME' }
			// Array: skills
			// { id: 'specialskill_MAGMATROOPER01', tier: 7,
			//	nameKey: 'SPECIALABILITY_MAGMATROOPER01_NAME', isZeta: false, tiers: 8 }
			// Array: mods
			// { id: 'nsdQon_cSIy44yjeGQVVXw', level: 15, tier: 4, slot: 1, set: 5,
			//	pips: 4, primaryStat: [Object], secondaryStat: [Array] }
			// Array: crew
			// Others: gp (int), primaryUnitStat (null), relic {currentTier: 1}

			let i = 0;
			let unitsByCombaType = {};
			let unitsCountByGear = {};
			let zetaCount = 0;

			for(i=0; i<20; i++) unitsCountByGear[i] = 0;
			for(i=1; i<3 ; i++) unitsByCombaType[i] = 0;
			player.unitCount = 0;
			player.unitsData = [];

			roster.forEach(function(unit) {
				unitsCountByGear[unit.gear]++;
				unitsByCombaType[unit.combatType]++; // 1 = character, 2 = ship

				// if (unit.defId==="AHSOKATANO") console.log("Unit:", unit); // for debug

				let unitZetas = 0;
				unit.skills.forEach(function(skill) {
					if (skill.isZeta && skill.tier===skill.tiers) unitZetas++;
				});
				zetaCount += unitZetas;

				if (unit.gp) {
					player.unitCount++;
					player.unitsData.push({
						"allycode":   allycode,
						"combatType": unit.combatType, // 1 = character, 2 = ship
						"gear":       unit.gear,
						"gp":         unit.gp,
						"level":      unit.level,
						"mods":       unit.mods,
						"name":       unit.defId,
						"relic":      (unit.relic && unit.relic.currentTier>1)? unit.relic.currentTier-2: 0,
						"stars":      unit.rarity,
						"zetaCount":  unitZetas
					});
				}
			});

			let clean_stats = {};
			stats.forEach(function(stat) {
				clean_stats[stat.nameKey.replace("STAT_", "")] = stat.value;
			});

			// console.log("-----");
			// console.log("Clean stats:");
			// console.dir(clean_stats);

			// console.log("-----");
			// console.log("Units by combat type: ", unitsByCombaType);

			// console.log("=====");
			console.log(logPrefix()+"Found user: "+player.name);

			player.allycode = allycode;
			player.charCount = unitsByCombaType[1];
			player.gp = clean_stats.GALACTIC_POWER_ACQUIRED_NAME;
			player.g11Count = unitsCountByGear[11];
			player.g12Count = unitsCountByGear[12];
			player.g13Count = unitsCountByGear[13];
			player.shipCount = unitsByCombaType[2];
			player.zetaCount = zetaCount;

			if (typeof(callback)==="function") callback(player, message);
			return;
		}

		// Fail:
		console.log(logPrefix()+"Player "+allycode+" not found: "+typeof(player));
		richMsg = new RichEmbed().setTitle("Warning!").setColor("ORANGE")
			.setDescription(["Ally " + allycode+" not found: "+typeof(player)])
			.setFooter(config.footer.message, config.footer.iconUrl);
		message.channel.send(richMsg);
	} catch(ex) {
		console.log(logPrefix()+"Player exception: ", ex);
		richMsg = new RichEmbed().setTitle("Error!").setColor("RED")
			.setDescription(["Failed to get player with allycode: "+allycode])
			.setFooter(config.footer.message, config.footer.iconUrl)
			.setTimestamp(message.createdTimestamp);
		message.channel.send(richMsg);
	}
};

exports.getPlayerGuild = async function getPlayerGuild(allycode, message, callback) {
	try {
		let locale = config.discord.locale; // shortcut
		let payload  = { allycodes:[ allycode ] };
		let { result, error, warning } = await swapi.fetchGuild(payload);
		let richMsg = null;
		let roster = null;

		if (warning) {
			if (warning.error && warning.error===warning.message) delete warning.error;
			console.log(logPrefix()+"MyWARN: ", warning);
			message.channel.send(warning.message);
		}

		if (error) {
			if (error.error && error.error===error.message) delete error.error;
			console.log(logPrefix()+"My ERR: ", error);
			richMsg = new RichEmbed().setTitle("Error!").setColor("RED")
				.setDescription(error.message)
				.setFooter(config.footer.message, config.footer.iconUrl);
			message.channel.send(richMsg);
			return;
		}

		if (result) {
			let guild = result[0];

			roster = guild.roster;
			/*
			guild.roster = "departed";
			console.log(logPrefix()+"Guild:");
			console.dir(result);

			console.log("-----");
			console.log(logPrefix()+"First player found in the guild:");
			console.dir(roster[0]);
			// id, guildMemberLevel (3), level (85), allycode, gp, gpChar, gpShip, updated (bigint)
			console.log("====="); // */

			let biggest = {gp: 0}; // biggest player
			let leader = {};
			let officerNames = [];

			roster.forEach(function(player) {
				if (player.gp > biggest.gp) biggest = player;

				switch(player.guildMemberLevel) {
					case 2: // member
						break;
					case 3: // officer
						officerNames.push(player.name);
						break;
					case 4: // chief (or grand-master)
						leader = player;
						break;
					default:
						console.warn("Found a player with guildMemberLevel of %s: ", player.guildMemberLevel, player);
				}
			});

			console.log(logPrefix()+"Found guild: "+guild.name);

			richMsg = new RichEmbed().setTitle(guild.name).setColor("GREEN")
				.setAuthor(config.discord.username)
				.setDescription([
					"**Guild description:** "+guild.desc,
					"",
					"**Officers ("+officerNames.length+"):** "+officerNames.sort().join(", ")
				])
				.addField("GP:",           guild.gp.toLocaleString(locale), true)
				.addField("Member count:", guild.members, true)
				.addField("GP average:",   Math.round(guild.gp/guild.members).toLocaleString(locale), true)
				.addField("Leader:",       leader.name +" (GP: "+ leader.gp.toLocaleString(locale)+")", true)
				.addField("Biggest GP:",   biggest.name+" (GP: "+biggest.gp.toLocaleString(locale)+")", true)
				.setTimestamp(guild.updated)
				.setFooter(config.footer.message, config.footer.iconUrl);
			message.reply(richMsg);
			if (typeof(callback)==="function") callback(guild, message);
			return;
		}

		// Fail:
		console.log(logPrefix()+"Guild with ally "+allycode+" not found: "+typeof(player));
		message.reply( "Guild with ally "+allycode+" not found: "+typeof(player));
		richMsg = new RichEmbed().setTitle("Warning!").setColor("ORANGE")
			.setDescription(["Ally " + allycode+" not found: "+typeof(player)])
			.setFooter(config.footer.message, config.footer.iconUrl);
		message.channel.send(richMsg);
	} catch(ex) {
		console.log(logPrefix()+"Guild exception: ", ex);
		richMsg = new RichEmbed().setTitle("Error!").setColor("RED")
			.setDescription(["Failed to get guild with ally: "+allycode])
			.setFooter(config.footer.message, config.footer.iconUrl);
		message.channel.send(richMsg);
	}
};

// vim: noexpandtab shiftwidth=4 softtabstop=4 tabstop=4
