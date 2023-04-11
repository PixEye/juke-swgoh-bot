/**
 * swgoh.js is SWGoH module for Juke's SWGoH Discord bot
 * @author PixEye@pixeye.net
 * @since  2023-04-11
 */

// jshint esversion: 8

exports.connect = function() {
	// TODO
};

/** Fetch a player data
 * @param object payload Payload with key: allycodes
 */
exports.fetchPlayer = async function(payload) {
	// const allycodes = payload.allycodes;
	const allycode = payload.allycodes.shift();
	const url = "http://api.swgoh.gg/player/" + allycode;

	let response = await fetch(url);

	return response.json();
};

/** Fetch a guild data
 * @param object payload Payload with key: allycodes
 */
exports.fetchGuild = async function(payload) {
	let player = await exports.fetchPlayer(payload);

	const guild_id = player.data.guild_id;
	player = {}; // free some memory

	const url = "https://swgoh.gg/api/guild-profile/" + guild_id;

	let response = await fetch(url);

	return response.json();
};

// vim: noexpandtab
