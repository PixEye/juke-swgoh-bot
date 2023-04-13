/**
 * ggApi.js is a module for Juke's SWGoH Discord bot to interact with the swgoh.gg API
 * @author PixEye@pixeye.net
 * @since  2023-04-11
 */

const swgohApi = require("./ggApi");

let allycode = "649-159-626".replace('-', '');
let payload = {"allycodes": [allycode]};
let player = swgohApi.fetchPlayer(payload);

console.log("Player's data:", player.data);

// vim: noexpandtab
