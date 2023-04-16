/**
 * ggApi.js is a module for Juke's SWGoH Discord bot to interact with the swgoh.gg API
 * @since  2023-04-11
 */

const swgohApi = require("./ggApi");

let allycode = "649-159-626".replace(/-/g, '');
let payload = {"allycodes": [allycode]};

swgohApi.fetchPlayer(payload)
.then(player => {
	console.log("Player's data:", player);
});

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
