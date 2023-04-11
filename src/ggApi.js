/**
 * swgoh.js is SWGoH module for Juke's SWGoH Discord bot
 * @author PixEye@pixeye.net
 * @since  2023-04-11
 */

// jshint esversion: 8

// Extract the required classes from the discord.js module:
//nst { RichEmbed } = require("discord.js");

// Create an instance of a Discord client:
//const client = new Client();

// Remember when this program started:
//const start = Date();

// Database connection:
//const mysql = require("mysql");

// Load other modules:
//nst locutus = require("./locutus"); // Functions from locutus.io
//nst swgoh   = require("./swgoh");  // SWGoH API of this bot (self file)
//nst tools   = require("./tools"); // Several functions
//nst view    = require("./view"); // Functions used to display results

// Get the configuration & its template from a separated JSON files:
// let config = require("./config.json");
// let tplCfg = require("./config-template.json");

// const omicronAbilities = require("../data/omicron-abilities");

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
	let json = await response.text();

	return JSON.parse(json); // JSON to object
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
	let json = await response.text();

	return JSON.parse(json); // JSON to object
};

// vim: noexpandtab
