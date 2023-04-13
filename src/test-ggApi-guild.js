/**
 * ggApi.js is a module for Juke's SWGoH Discord bot to interact with the swgoh.gg API
 * @since  2023-04-11
 */

const swgohApi = require("./ggApi");
const guildMapping = {
	"ally_code": "c",
	"member_level": "l",
	"galactic_power": "gp",
	"player_name": "n",
	// "guild_join_time": "",
	// "lifetime_season_score": "",
	// "player_level": "",
	// "league_id": "",
	// "league_name": "league",
	// "league_frame_image": "",
	// "portrait_image": "",
	// "title": "",
	// "squad_power": ""
};

let allycode = "649-159-626".replace(/-/g, '');
let payload = {"allycodes": [allycode]};

swgohApi.fetchGuild(payload)
.then(guild => {
	let offCount = 0;
	guild.data.members.forEach((member, i, arr) => {
		let plainMember = {"i": 0};

		Object.keys(guildMapping).forEach(key => {
			plainMember[guildMapping[key]] = member[key];
		})
		arr[i] = plainMember;
		if (member.member_level>2) ++ offCount;
	});
	guild.data.members.sort((a, b) => b.gp - a.gp);
	guild.data.members.forEach((member, i, arr) => {
		member.i = i<9? '0'+(i+1): ''+(i+1);
		member.n = member.n.substr(-15); // shorten too long nicknames
		arr[i] = member;
	});
	guild.data.officer_count = offCount;
	console.log("Guild data:", guild.data);
});

/** Sample: {
  guild_id: 'r8F1wrr4SXaafHtSsINaYw',
  name: 'Delirium',
  external_message: 'HL familial. https://discord.gg/azssYb7 REQUIS + 6M5 PG & >= 3 GLs+Executor ou Pfdty',
  banner_color_id: 'white_red',
  banner_logo_id: 'guild_icon_niteowl',
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
