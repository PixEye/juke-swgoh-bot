/**
 * ggApi.js is a module for Juke's SWGoH Discord bot to interact with the swgoh.gg API
 * @since  2023-04-11
 */

const swgohApi = require("./ggApi");

let allycode = "649-159-626".replace(/-/g, '');
let payload = {"allycodes": [allycode]};

swgohApi.fetchGuild(payload)
.then(guild => {
	/* guild.members.sort((a, b) => b.gp - a.gp);

	guild.members.forEach((member, i, arr) => {
		member.i = i<9? '0'+(i+1): ''+(i+1);
		member.name = member.name.slice(-15); // shorten too long nicknames
		arr[i] = member;
	}); // */
	guild.members = "Array of "+guild.members.length+" members";
	console.log("Guild:", guild);
});

/** Sample: {
  guild_id: 'r8F1wrr4S...fHtSsINaYw',
  name: 'Delirium',
  external_message: 'HL familial. https://discord.gg/azssYb7 REQUIRED + 6M5 PG & >= 3 GLs+Executor ou Profundity',
  banner_color_id: 'white_red',
  banner_logo_id: 'guild_icon_niteOwl',
  enrollment_status: 2,
  galactic_power: 403344143,
  guild_type: '',
  level_requirement: 85,
  member_count: 49,
  members: [{
      galactic_power: 9113972,
      guild_join_time: '2020-07-07T06:56:45',
      lifetime_season_score: 696758,
      member_level: 4,
      ally_code: 649159626,
      player_level: 85,
      player_name: 'Juke M',
      league_id: 'KYBER',
      league_name: 'Kyber',
      league_frame_image: 'https://game-assets.swgoh.gg/tex.vanity_portrait_league_kyber.png',
      portrait_image: 'https://game-assets.swgoh.gg/tex.vanity_deathtrooper.png',
      title: 'Ship Captain',
      squad_power: 180607
    }, ...
  ]
 */

// vim: noexpandtab
