/**
 * ggApi.js is a module for Juke's SWGoH Discord bot to interact with the swgoh.gg API
 * @author PixEye@pixeye.net
 * @since  2023-04-11
 */

// jshint esversion: 8

const https = require('https');

/* exports.connect = function() {
	// TODO
}; // */

/** Fetch a player data
 * @param object payload Payload with key: allycodes
 * @return Promise
 */
exports.fetchPlayer = async function(payload) {
	const allycode = payload.allycodes.shift();
	const url = "https://api.swgoh.gg/player/" + allycode;

	/* try {
		let response = await fetch(url); // needs NodeJS 12 or +
		if (!response.ok) {
			let txt = await response.text();
			console.warn(url + ' failed!', txt);

			return {}
		}

		return response.json(); // */
	https.get(url, (res) => {
		console.log('statusCode:', res.statusCode);
		console.log('headers:', res.headers);

		res.on('data', (d) => {
			console.log('OK, got data');
			return JSON.parse(d);
		});
	}).on('error', (e) => {
		console.warn("fetchPlayer: Warning >", e);
		/* { Error: write EPROTO 9208:error:1408F10B:SSL routines:ssl3_get_record:wrong version number:c:\ws\deps\openssl\openssl\ssl\record\ssl3_record.c:332:
    at WriteWrap.afterWrite [as oncomplete] (net.js:788:14) errno: 'EPROTO', code: 'EPROTO', syscall: 'write' } // */
	});
};

/** Fetch a guild data
 * @param object payload Payload with key: allycodes
 * @return Promise
 */
exports.fetchGuild = async function(payload) {
	let player = await exports.fetchPlayer(payload);

	const guild_id = player.data.guild_id;
	player = {}; // free some memory

	const url = "https://swgoh.gg/api/guild-profile/" + guild_id;

	try {
		let response = await fetch(url);
		if (!response.ok) {
			let txt = await response.text();
			console.warn(url + ' failed!', txt);

			return {}
		}

		return response.json();
	} catch (e) {
		console.warn("fetchGuild: Warning >", e);
	}
};

// vim: noexpandtab
