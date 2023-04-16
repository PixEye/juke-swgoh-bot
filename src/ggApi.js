/**
 * ggApi.js is a module for Juke's SWGoH Discord bot to interact with the swgoh.gg API
 * @since  2023-04-11
 */

const { base_parse } = require("node-html-parser/dist/nodes/html");

const debug = true;
const mapping = {
	"player": {
		"ally_code": "allyCode",
		"galactic_power": "gp",
		"guild_exchange_donations": "giftCount",
		"league_name": "leagueName",
		"division_number": "leagueNumber",
		"name": "name",
		"title": "title"
	}
};

/* exports.connect = function() {
	// TODO
}; // */

/** Fetch a player data
 * @param object payload Payload with key: allycodes
 * @return Promise
 */
exports.fetchPlayer = async function(payload) {
	const allycode = payload.allycodes[0];
	const url = "https://swgoh.gg/api/player/" + allycode;

	try {
		console.log('GET', url);
		let response = await fetch(url); // needs NodeJS 12 or +
		if (!response.ok) {
			let txt = await response.text();
			console.warn(url + ' failed!', txt);

			return {}
		}

		if (debug) console.log('Response is OK for payload:', payload);
		let result = await response.json();

		result.data.arena = {};
		result.data.fleet_arena = {};
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

		let omicronCount = 0;
		let omicronUnits = {};
		let player = {
			"guild": {
				"id": result.data.guild_id,
				"name": result.data.guild_name,
				"url": result.data.guild_url,
			},
			"units": [],
			"allyCode": allycode,
			"glHasUltimate": []
		};
		let unitCountByCombatType = {};

		result.units.forEach(unit => {
			unit = unit.data;
			unit.gp = unit.power;
			delete unit.power;
			player.units.push(unit);
			if (unit.omicron_abilities.length) {
				omicronUnits[unit.base_id] = unit.omicron_abilities.length;
				omicronCount += unit.omicron_abilities.length;
			}

			let ct = unit.combat_type;
			if (!unitCountByCombatType.hasOwnProperty(ct))
				unitCountByCombatType[ct] = 1;
			else
				++ unitCountByCombatType[ct];
			if (unit.is_galactic_legend) {
				player.glHasUltimate[unit.base_id] = unit.has_ultimate;
			}
		});

		Object.keys(mapping.player).forEach(initKey => {
			let target = mapping.player[initKey];
			player[target] = result.data[initKey];
		});
		player.omicronUnits = omicronUnits;
		// player.shipCount = unitCountByCombatType[2];
		// player.toonCount = unitCountByCombatType[1];
		player.unitCount = result.units.length;
		player.unitCountByCombatType = unitCountByCombatType;

		return player
	} catch(e) {
		console.warn("fetchPlayer() with fetch() -", e);
	}
};

/** Fetch a guild data
 * @param object payload Payload with key: allycodes
 * @return Promise
 */
exports.fetchGuild = async function(payload) {
	let player = await exports.fetchPlayer(payload);

	const guild_id = player.guild.id;
	player = {}; // free some memory

	const url = "https://swgoh.gg/api/guild-profile/" + guild_id;

	try {
		console.log('GET', url);
		let response = await fetch(url);
		if (!response.ok) {
			let txt = await response.text();
			console.warn(url + ' failed!', txt);

			return {}
		}

		if (debug) console.log('Response is OK for payload:', payload);

		return response.json();
	} catch (e) {
		console.warn("fetchGuild() -", e);
	}
};

/* Player's data: {
  ally_code: 649159626,
  arena_leader_base_id: 'JEDI'+'MASTER'+'KENOBI',
  arena_rank: 2,
  level: 85,
  name: 'Juke M',
  last_updated: '2023-04-12T21:07:13',
  galactic_power: 9113972,
  character_galactic_power: 5383915,
  ship_galactic_power: 3730057,
  ship_battles_won: 3760,
  pvp_battles_won: 4687,
  pve_battles_won: 265073,
  pve_hard_won: 97663,
  galactic_war_won: 26099,
  guild_raid_won: 2154,
  guild_contribution: 3349697,
  guild_exchange_donations: 4106,
  season_full_clears: 79,
  season_successful_defends: 884,
  season_league_score: 696758,
  season_undersized_squad_wins: 584,
  season_promotions_earned: 66,
  season_banners_earned: 565239,
  season_offensive_battles_won: 2816,
  season_territories_defeated: 799,
  url: '/p/649159626/',
  arena: {},
  fleet_arena: {},
  skill_rating: 2994,
  division_number: 4,
  league_name: 'Kyber',
  league_frame_image: 'https://game-assets.swgoh.gg/tex.vanity_portrait_league_kyber.png',
  league_blank_image: 'https://game-assets.swgoh.gg/tex.league_icon_kyber_blank.png',
  league_image: 'https://game-assets.swgoh.gg/tex.league_icon_kyber.png',
  division_image: 'https://game-assets.swgoh.gg/tex.league_icon_kyber_4.png',
  portrait_image: 'https://game-assets.swgoh.gg/tex.vanity_deathtrooper.png',
  title: 'Ship Captain',
  guild_id: 'r8F1wrr4S....HtSsINaYw',
  guild_name: 'Delirium',
  guild_url: '/g/r8F1wrr4S....HtSsINaYw/',
  mods: []
} */

// vim: noexpandtab
