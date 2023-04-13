/**
 * ggApi.js is a module for Juke's SWGoH Discord bot to interact with the swgoh.gg API
 * @since  2023-04-11
 */

const debug = true;

/* exports.connect = function() {
	// TODO
}; // */

/** Fetch a player data
 * @param object payload Payload with key: allycodes
 * @return Promise
 */
exports.fetchPlayer = async function(payload) {
	const allycode = payload.allycodes.shift();
	const url = "https://swgoh.gg/api/player/" + allycode;

	try {
		console.log('GET', url);
		let response = await fetch(url); // needs NodeJS 12 or +
		if (!response.ok) {
			let txt = await response.text();
			console.warn(url + ' failed!', txt);

			return {}
		}

		let data = await response.json();
		if (debug) console.log('Response is OK');

		return data
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

	const guild_id = player.data.guild_id;
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

		return response.json();
	} catch (e) {
		console.warn("fetchGuild() -", e);
	}
};

// vim: noexpandtab
