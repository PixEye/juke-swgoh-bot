// Get the configuration from a separated JSON file:
const config = require("./config.json");

// SWGoH API connection:
const ApiSwgohHelp = require("api-swgoh-help");
const swapi = new ApiSwgohHelp({
	"username": config.swapi.user,
	"password": config.swapi.pwd
});

// Extract the required classes from the discord.js module:
const { Client, RichEmbed } = require("discord.js");

exports.getPlayerData = async function getPlayerData(allycode, message, callback) {
	try {
		// let acquiredToken = await swapi.connect();
		// console.log(Date()+" - Token: ", acquiredToken);

		let locale = "fr-FR";
		let payload  = { "allycodes": [allycode] };
		let { result, error, warning } = await swapi.fetchPlayer(payload);
		let richMsg = null;
		let roster = null;
		let stats  = null;

		if (error)   console.log(Date()+" - My ERR: ", error);
		if (warning) console.log(Date()+" - MyWARN: ", warning);
		if (result) {
			let player = result[0];

			roster = player.roster;
			stats  = player.stats;

			/*
			player.portraits = "departed"; // { selected: string, unlocked: [strings] }
			player.roster    = "departed"; // array
			player.stats     = "departed"; // array
			player.titles    = "departed"; // { selected: string, unlocked: [strings] }
			console.log(Date()+" - Player:");
			console.dir(player); // */

			// console.log("-----");
			// console.log("First unit of the player's roster:");
			// console.dir(roster[0]);
			// id, defId, nameKey, rarity (7), level (85), xp, gear (8), combatType
			// Arrays: equipped, skills, mods

			let i = 0;
			let unitCount = 0;
			let unitsByCombatType = {};
			let unitsCountByGear  = {};
			let zetaCount = 0;

			for(i=0; i<20; i++) unitsCountByGear[i] = 0;
			for(i=1; i<3 ; i++) unitsByCombatType[i] = 0;

			roster.forEach(function(unit) {
				unitsCountByGear[unit.gear]++;
				unitsByCombatType[unit.combatType]++;
				if (unit.gp) unitCount++;

				unit.skills.forEach(function(skill) {
					if (skill.isZeta && skill.tier===skill.tiers) zetaCount++;
				});
			});

			let clean_stats = {};
			stats.forEach(function(stat) {
				clean_stats[stat.nameKey.replace("STAT_", "")] = stat.value;
			});

			// console.log("-----");
			// console.log("Clean stats:");
			// console.dir(clean_stats);

			// console.log("-----");
			// console.log("Units by combat type: ", unitsByCombatType);

			// console.log("=====");
			console.log(Date()+" - Found: "+player.name);

			player.gp = clean_stats.GALACTIC_POWER_ACQUIRED_NAME;
			player.g12Count = unitsCountByGear[12];
			player.g13Count = unitsCountByGear[13];
			player.zetaCount = zetaCount;

			richMsg = new RichEmbed().setTitle(player.name+"'s profile").setColor("GREEN")
				.setDescription([
					"**Level:** "+player.level+"\t"+
					"**GP:** "+(player.gp.toLocaleString(locale)),
					"**Guild name:** "+player.guildName,
					"",
					"**Zeta count:** "+zetaCount,
					"**G13 count:** "+unitsCountByGear[13],
					"**G12 count:** "+unitsCountByGear[12],
					"**G11 count:** "+unitsCountByGear[11],
					"",
					"**Ground arena rank:** "+player.arena.char.rank,
					"**Ship arena rank:** "+player.arena.ship.rank,
					"",
					"**Number of chars:** "+unitsByCombatType[1],
					"**Number of ships:** "+unitsByCombatType[2],
					"**Total number of unlocked units:** "+unitCount
				])
				.setTimestamp(player.updated)
				.setFooter(config.footer.message, config.footer.iconUrl);
			message.reply(richMsg);
			if (typeof(callback)==="function") callback(player);
			return;
		}

		// Fail:
		console.log(Date()+" - Player "+allycode+" not found: "+typeof(player));
		richMsg = new RichEmbed().setTitle("Warning!").setColor("ORANGE")
			.setDescription(["Ally " + allycode+" not found: "+typeof(player)])
			.setFooter(config.footer.message, config.footer.iconUrl);
		message.channel.send(richMsg);
	} catch(ex) {
		console.log(Date()+" - Player exception: ", ex);
		richMsg = new RichEmbed().setTitle("Error!").setColor("RED")
			.setDescription(["Failed to get player with allycode: "+allycode])
			.setFooter(config.footer.message, config.footer.iconUrl);
		message.channel.send(richMsg);
	}
};

exports.getPlayerGuild = async function getPlayerGuild(allycode, message, callback) {
	try {
		let locale = "fr-FR";
		let payload  = { allycodes:[ allycode ] };
		let { result, error, warning } = await swapi.fetchGuild(payload);
		let richMsg = null;
		let roster = null;

		if (error)   console.log(Date()+" - My ERR: ", error);
		if (warning) console.log(Date()+" - MyWARN: ", warning);
		if (result) {
			let guild = result[0];

			roster = guild.roster;
			/*
			guild.roster = "departed";
			console.log(Date()+" - Guild:");
			console.dir(result);

			console.log("-----");
			console.log(Date()+" - First player found in the guild:");
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

			console.log(Date()+" - Found: "+guild.name);

			richMsg = new RichEmbed().setTitle(guild.name).setColor("GREEN")
				.setAuthor(config.username)
				.setDescription([
					"**Guild description:** "+guild.desc,
					"",
					"**Officers ("+officerNames.length+"):** "+officerNames.sort().join(", ")
				])
				.addField("**GP:**",           guild.gp.toLocaleString(locale), true)
				.addField("**Member count:**", guild.members, true)
				.addField("**GP average:**",   Math.round(guild.gp/guild.members).toLocaleString(locale), true)
				.addField("**Leader:**",        leader.name+" (GP: "+ leader.gp.toLocaleString(locale)+")", true)
				.addField("**Biggest GP:**",   biggest.name+" (GP: "+biggest.gp.toLocaleString(locale)+")", true)
				.setTimestamp(guild.updated)
				.setFooter(config.footer.message, config.footer.iconUrl);
			message.reply(richMsg);
			if (typeof(callback)==="function") callback(guild);
			return;
		}

		// Fail:
		console.log(Date()+" - Guild with ally "+allycode+" not found: "+typeof(player));
		message.reply( "Guild with ally "+allycode+" not found: "+typeof(player));
		richMsg = new RichEmbed().setTitle("Warning!").setColor("ORANGE")
			.setDescription(["Ally " + allycode+" not found: "+typeof(player)])
			.setFooter(config.footer.message, config.footer.iconUrl);
		message.channel.send(richMsg);
	} catch(ex) {
		console.log(Date()+" - Guild exception: ", ex);
		richMsg = new RichEmbed().setTitle("Error!").setColor("RED")
			.setDescription(["Failed to get guild with ally: "+allycode])
			.setFooter(config.footer.message, config.footer.iconUrl);
		message.channel.send(richMsg);
	}
};

// vim: noexpandtab shiftwidth=4 softtabstop=4 tabstop=4
