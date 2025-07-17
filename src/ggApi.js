/**
 * ggApi.js is a module for Juke's SWGoH Discord bot to interact with the swgoh.gg API
 * @since  2023-04-11
 */

const debug = true;
const mapping = {
	"guild": {
		"guild_id": "id",
		"galactic_power": "gp",
		"member_count": "memberCount",
		"members": "members",
		"external_message": "desc",
		"level_requirement": "required",
		"last_sync": "updated"
	},
	"guildMember": {
		"ally_code": "allyCode",
		"member_level": "guildMemberLevel",
		"galactic_power": "gp",
		"player_name": "name",
		// "guild_join_time": "",
		// "lifetime_season_score": "",
		// "player_level": "",
		// "league_id": "",
		// "league_name": "league",
		// "league_frame_image": "",
		// "portrait_image": "",
		// "title": "",
		// "squad_power": ""
	},
	"player": {
		"ally_code": "allyCode",
		"galactic_power": "gp",
		"guild_exchange_donations": "giftCount",
		"league_name": "leagueName",
		"division_number": "leagueNumber",
		"level": "level",
		"name": "name",
		"title": "title",
		"last_updated": "updated"
	}
};
const config = require("./config.json");
const tools = require("./tools"); // Several functions

/** Fetch a player data
 * @param object payload Payload with key: allycodes
 * @return Promise
 */
exports.fetchPlayer = async function(payload) {
	const allycode = payload.allycodes[0];
	const params = {
		'headers': {
			'x-gg-bot-access': config.swApi.key
		}
	};
	const url = "https://swgoh.gg/api/player/" + allycode;

	let logPrefix = tools.logPrefix;

	try {
		console.log(logPrefix()+'GET', url);
		let response = await fetch(url, params); // needs NodeJS 12 or +
		if (!response.ok) {
			let txt = await response.text();
			console.warn(url + ' failed!', txt);

			return {}
		}

		if (debug) console.log(logPrefix()+'Response is OK for payload:', payload);
		let result = await response.json();
		let zetaCount = 0;

		// if (debug) return Object.keys(result) // [ 'units', 'mods', 'data'+'crons', 'data' ]
		/* if (debug) return Object.keys(result.units[0].data) // returns: [
			'base_id',        'name',
			'gear_level',     'level',
			'power',          'rarity',
			'gear',           'url',
			'stats',          'stat_diffs',
			'zeta_abilities', 'omicron_abilities',
			'ability_data',   'mod_set_ids',
			'combat_type',    'relic_tier',
			'has_ultimate',   'is_galactic_legend'
			] */

		let player = {
			"allyCode": allycode,
			"arena": result.data.arena,
			"fleet_arena": result.data.fleet_arena,
			"glHasUltimate": [],
			"guild": {
				"id"  : result.data.guild_id,
				"name": result.data.guild_name,
				"url" : result.data.guild_url,
			},
			"omicronCount": 0,
			"omicronSkills": [],
			"omicronUnits": {},
			"units": []
		};
		let unitCountByCombatType = {};
		let modsByUnit = {};

		result.mods.forEach(mod => {
			if (!modsByUnit.hasOwnProperty(mod.character)) {
				modsByUnit[mod.character] = [];
			}
			modsByUnit[mod.character].push(mod);
		});

		result.units.forEach(unit => {
			unit = unit.data;

			unit.gp = unit.power; // power => gp
			delete unit.power;

			unit.mods = modsByUnit[unit.base_id]; // was: unit.mod_set_ids;
			// delete unit.mod_set_ids;

			player.units.push(unit);

			if (unit.omicron_abilities.length) {
				player.omicronCount += unit.omicron_abilities.length;
				player.omicronSkills.push(unit.omicron_abilities);
				player.omicronUnits[unit.base_id] = unit.omicron_abilities.length;
			}
			zetaCount += unit.zeta_abilities.length;

			let ct = unit.combat_type;
			if (!unitCountByCombatType.hasOwnProperty(ct))
				unitCountByCombatType[ct] = 1;
			else
				++ unitCountByCombatType[ct];

			if (unit.is_galactic_legend) {
				player.glHasUltimate[unit.base_id] = unit.has_ultimate;
			}

			if (!tools.unitRealNames[unit.base_id]) {
				tools.addUnitName(unit.base_id, unit.name);
			}
		});

		Object.keys(mapping.player).forEach(key => {
			let targetKey = mapping.player[key];

			player[targetKey] = result.data[key];
		});

		// player.shipCount = unitCountByCombatType[2];
		// player.toonCount = unitCountByCombatType[1];
		player.unitCount = result.units.length;
		player.unitCountByCombatType = unitCountByCombatType;
		player.zetaCount = zetaCount;
		player.updated += 'Z'; // gg times are in UTC

		return player
	} catch(e) {
		console.warn("fetchPlayer() with fetch() -", e);
		throw e;
	}
};

/** Fetch a guild data
 * @param object payload Payload with key: allycodes
 * @return Promise
 */
exports.fetchGuild = async function(payload) {
	let logPrefix = tools.logPrefix;
	let player = await exports.fetchPlayer(payload);

	const guild_id = player.guild.id;
	const params = {
		'headers': {
			'x-gg-bot-access': config.swApi.key
		}
	};
	const url = "https://swgoh.gg/api/guild-profile/" + guild_id;

	player = {}; // free some memory

	try {
		console.log(logPrefix()+'GET', url);
		let response = await fetch(url, params);
		if (!response.ok) {
			let txt = await response.text();
			console.warn(url + ' failed!', txt);

			return {}
		}

		if (debug) console.log('Response is OK for guild:', guild_id);

		let guild = await response.json();

		guild = guild.data;

		Object.keys(mapping.guild).forEach(key => {
			let targetKey = mapping.guild[key];

			guild[mapping.guild[key]] = guild[key];
			if (targetKey!==key) delete guild[key];
		});
		guild.updated += 'Z'; // gg times are in UTC

		guild.officerCount = 0;
		guild.members.forEach((member, i) => {
			let plainMember = {"i": 0};

			Object.keys(mapping.guildMember).forEach(key => {
			let targetKey = mapping.guildMember[key];

				plainMember[targetKey] = member[key];
				if (targetKey!==key) delete plainMember[key];
			})
			guild.members[i] = plainMember;
			if (member.member_level>2) ++ guild.officerCount;
		});

		return guild;
	} catch (e) {
		console.warn("fetchGuild() -", e);
		throw e;
	}
};

// vim: noexpandtab
