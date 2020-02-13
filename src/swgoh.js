/**
 * swgoh.js is SWGoH module for Juke's SWGoH Discord bot
 * @author PixEye@pixeye.net
 * @since  2019-10-29
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

// Load other modules:
//const locutus = require("./locutus"); // Functions from locutus.io
//const swgoh   = require("./swgoh"); // SWGoH API
const tools   = require("./tools"); // Several functions
const view    = require("./view");  // Functions used to display results

// Shortcut(s):
let logPrefix = tools.logPrefix;

// SWGoH Help API connection:
const ApiSwgohHelp = require("api-swgoh-help");
const swapi = new ApiSwgohHelp({
	"username": config.swapi.user,
	"password": config.swapi.pwd
});

/** Get player(s)' data from the SWGoH Help API
 * @param {Array} users - An array of users' objects with: [allycode & displayAvatarURL] each
 * @param {Object} message - The user's message to reply to
 * @param {function} callback - Function to call once the data is retrieved
 */
exports.getPlayerData = async function(users, message, callback) {
	try {
		// let acquiredToken = await swapi.connect();
		// console.log(logPrefix()+"Token: ", acquiredToken);

		if ( ! (users instanceof Array) ) users = [users];

		let allycodes = [];
		let playersByAllycode = {};

		users.forEach(function(user) {
			allycodes.push(user.allycode);
			playersByAllycode[user.allycode] = user;
		});

		let input  = { "allycodes": allycodes }; // payload
		if (allycodes.length<1) {
			console.warn(logPrefix()+allycodes.length+" allycodes found!");
			return;
		}

		let { result, error, warning } = await swapi.fetchPlayer(input); // <--
		let richMsg = null;
		let roster = null;
		let stats  = null;

		/* if (warning) { // useless
			if (warning.error && warning.error===warning.message) delete warning.error;
			console.warn(logPrefix()+"GetPlayerData WARN: ", warning);
			message.channel.send(warning.message);
		} // */

		if (error) {
			if (error.error && error.error===error.message) delete error.error;
			console.warn(logPrefix()+"GetPlayerData ERR: ", error);
			message.channel.send(error.message);
			// throw error.message;
			return;
		}

		let allycode = allycodes[0]; // TODO: a loop to handle multiple players

		if (!result) {
			// Fail:
			console.log(logPrefix()+"Player "+allycode+" not found!");
			richMsg = new RichEmbed().setTitle("Warning!").setColor("ORANGE")
				.setDescription(["Ally " + allycode+" not found!"])
				.setFooter(config.footer.message, config.footer.iconUrl);
			message.channel.send(richMsg);
			return;
		}

		// console.log(logPrefix()+"Players by allycode: ", playersByAllycode);

		result.forEach(function(player) {
			let clean_stats = null;

			roster = player.roster;
			stats  = player.stats;

			player.displayAvatarURL = playersByAllycode[allycode].displayAvatarURL;

			/*
			player.portraits = "departed"; // { selected: string, unlocked: [strings] }
			player.roster    = "departed"; // array
			player.stats     = "departed"; // array
			player.titles    = "departed"; // { selected: string, unlocked: [strings] }
			console.log(logPrefix()+"Player:");
			console.dir(player); // */
			/* { id: 'P2763...', name: '...', level: 85, allyCode (number),
			  titles: 'departed', guildRefId: 'G15...', guildName, guildBannerColor: 'white_red',
			  guildBannerLogo: 'guild_icon_senate', guildTypeId: 'NORMAL' */
			if (player.guildRefId==='G1582274835')
				player.guildName = 'Force Francophone'; // Custom hack

			// console.log("-----");
			// console.log("First unit of the player's roster:");
			// console.dir(roster[0]);
			// console.log("First unit's crew of the player's roster:", roster[0].crew); // []
			//
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
			// console.log(logPrefix()+"First unit (%s) first mod:\n ",
			//	roster[0].defId, roster[0].mods[0]); // ?
			// if (roster[0].mods[0]) console.log(logPrefix()+"First unit (%s) first mod/primaryStat:\n ",
			//	roster[0].defId, roster[0].mods[0].primaryStat); // { unitStat: 48, value: 4 }
			// secondaryStat: [ // example:
			// { unitStat: 56, value: 1.384, roll: 1 },
			// { unitStat: 53, value: 3.179, roll: 2 },
			// { unitStat: 5 , value: 11   , roll: 3 },
			// { unitStat: 28, value: 438  , roll: 1 } ]
			// Array: crew ([])
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

			clean_stats = {};
			stats.forEach(function(stat) {
				if (!stat || stat.nameKey===null) return;

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
			player.title = player.titles.selected?
				player.titles.selected.replace('PLAYERTITLE_', '').replace(/_/g, ' '): 'Default';
			player.zetaCount = zetaCount;

			if (typeof(callback)==="function") callback(player, message);
		});
	} catch(ex) {
		console.log(logPrefix()+"Player exception: ", ex);
		richMsg = new RichEmbed().setTitle("Error!").setColor("RED")
			.setDescription(["Failed to get player with allycode: "+allycode])
			.setFooter(config.footer.message, config.footer.iconUrl)
			.setTimestamp(message.createdTimestamp);
		message.channel.send(richMsg);
	}
};

/** Get data for a guild from the SWGoH Help API
 * @param {Array|number} allycodes - An allycode (as number) or an array of numbers
 * @param {Object} message - The user's message to reply to
 * @param {function} callback - Function to call once the data is retrieved
 */
exports.getPlayerGuild = async function(allycodes, message, callback) {
	try {
		if ( typeof(allycodes)!=="object" || ! (allycodes instanceof Array) )
			allycodes = [allycodes];

		let allycode = allycodes[0]; // keep only the first one: 1 guild at once
		let msg = "";
		let input  = { "allycodes": allycodes }; // payload
		let locale = config.discord.locale; // shortcut
		let { result, error, warning } = await swapi.fetchGuild(input); // <--
		let richMsg = null;
		let roster = null;

		/* if (warning) { // useless
			if (warning.error && warning.error===warning.message) delete warning.error;
			console.log(logPrefix()+"GPG WARN: ", warning);
			message.channel.send(warning.message);
		} // */

		if (error) {
			if (error.error && error.error===error.message) delete error.error;
			console.log(logPrefix()+"GPG ERR: ", error);
			richMsg = new RichEmbed().setTitle("Error!").setColor("RED")
				.setDescription(error.message)
				.setFooter(config.footer.message, config.footer.iconUrl);
			message.channel.send(richMsg);
			return;
		}

		if (!result) {
			// Fail:
			msg = "Guild with ally "+allycode+" not found: "+typeof(player);
			console.log(logPrefix()+msg);
			richMsg = new RichEmbed().setTitle("Warning!").setColor("ORANGE")
				.setDescription([msg])
				.setFooter(config.footer.message, config.footer.iconUrl);
			message.channel.send(richMsg);
			return;
		}

		let guild = result[0];

		roster = guild.roster;
		// delete guild.roster;

		/*
		guild.roster = "departed";
		console.log(logPrefix()+"Guild:");
		console.dir(result); // id (G1582274...), name, desc, members (int), status (2),
			// required (85), bannerColor (white_red), bannerLogo (guild_icon_senate),
			// message (current yellow banner content), gp,
			// raid: { rancor: 'HEROIC80', aat: 'HEROIC80', sith_raid: 'HEROIC85' }
			// roster, updated

		console.log("-----");
		console.log(logPrefix()+"First player found in the guild:");
		console.dir(roster[0]);
		// id, guildMemberLevel (3), name, level (85), allyCode, gp, gpChar, gpShip, updated (bigint)
		console.log("====="); // */

		if (guild.id==='G1582274835') guild.name = 'Force Francophone'; // Custom hack

		guild.biggestPlayer = {gp: 0};
		guild.gpChar = 0;
		guild.gpShip = 0;
		guild.leader = {};
		guild.memberCount = guild.members;
		guild.officerNames = [];
		guild.players = {}; // allycode => (IG nick) name
		delete guild.members;

		roster.forEach(function(player) {
			guild.gpChar+= player.gpChar;
			guild.gpShip+= player.gpShip;
			guild.players[player.allyCode] = player.name;

			if (player.gp > guild.biggestPlayer.gp) guild.biggestPlayer = player;

			switch(player.guildMemberLevel) {
				case 2: // member
					break;

				case 3: // officer
					guild.officerNames.push(player.name);
					break;

				case 4: // chief or grand-master (GM)
					guild.leader = player;
					break;

				default: // should not happen
					msg = "Found a player with guildMemberLevel of %s: ";
					console.warn(msg, player.guildMemberLevel, player);
			}
		});
		console.log(logPrefix()+"Ship GP before fix: %s", guild.gpShip.toLocaleString(locale));
		guild.gpShip = guild.gp - guild.gpChar; // fix
		console.log(logPrefix()+"Ship GP after  fix: %s", guild.gpShip.toLocaleString(locale));

		console.log(logPrefix()+"Found %d players in guild:", Object.keys(guild.players).length, guild.name);

		if (typeof(callback)==="function") callback(guild);
	} catch(ex) {
		console.log(logPrefix()+"Guild exception: ", ex);
		richMsg = new RichEmbed().setTitle("Error!").setColor("RED")
			.setDescription(["Failed to get guild with ally: "+allycode])
			.setFooter(config.footer.message, config.footer.iconUrl);
		message.channel.send(richMsg);
	}
};

// vim: noexpandtab shiftwidth=4 softtabstop=4 tabstop=4
