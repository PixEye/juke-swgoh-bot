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

// vim: noexpandtab
