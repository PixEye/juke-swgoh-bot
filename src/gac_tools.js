/**
 * gac_tools.js is the functions module for Juke's SWGoH Discord bot to handle the gac functions
 * @author Falmmer
 * @since 2021-10-25
 */

// jshint esversion: 8

// Extract the required classes from the discord.js module:
// const { RichEmbed } = require("discord.js");

// Database connection:
const mysql = require("mysql");

// Load other module(s):
// const locutus = require("./locutus"); // Functions from locutus.io
// const swgoh   = require("./swgoh");  // SWGoH API
// const view	= require("./view"); // Functions used to display results
const tools = require("./tools");

// Get the configuration & its template from a separated JSON files:
let config = require("./config.json");
// let tplCfg = require("./config-template.json");

let logPrefix = tools.logPrefix // shortcut

// Prepare DB connection pool:
const db_pool = mysql.createPool({
	connectionLimit: config.db.conMaxCount,
	database	   : config.db.name,
	host		   : config.db.host,
	password	   : config.db.pass,
	user		   : config.db.user
});

/** Check if player is registered to current GA and return the initial stats
 * @param {Object} player The target player
 * @param {Object} message The origin message (request)
 */
 exports.checkGrandArenaRegistration = function(player, message) {
	let allycode = player.allycode;
	let sql_query = "SELECT count(id) AS cnt FROM `current_ga` WHERE allycode="+parseInt(allycode)+" AND round=0;"
	console.log(logPrefix()+"SQL: "+sql_query);

	db_pool.query(sql_query, function(exc, result) {
		if (exc) {
			let otd = exc.sqlMessage? exc.sqlMessage: exc; // object to display

			// console.log("SQL:", sql);
			console.log(logPrefix()+"CheckGrandArenaRegister Exception:", otd);
			return;
		}
		exports.grandArenaRegistration(player, message, result);
	});
}

/** Get the player's initial stats when he registered to the current GA
 * @param {object} player The target player
 * @param {object} message The origin message (request)
 */
 exports.getInitializedGrandArenaValues = function(player, message) {
	let allycode = player.allycode;
	let sql_query = "SELECT * FROM `current_ga` WHERE allycode="+parseInt(allycode)+" ORDER BY ts DESC LIMIT 1;"
	console.log(logPrefix()+"SQL: "+sql_query);

	db_pool.query(sql_query, function(exc, result) {
		if (exc) {
			let otd = exc.sqlMessage? exc.sqlMessage: exc; // object to display

			// console.log("SQL:", sql);
			console.log(logPrefix()+"GetInitializedGrandArenaValues Exception:", otd);
			return;
		}

		exports.registerGrandArenaResult(player, message, result);
	});
}

/** Get the player's registered GAs
 * @param {object} player The target player
 * @param {object} message The origin message (request)
 */
 exports.getPlayerGAs = function(player, message, callback) {
	let allycode = player.allycode;
	let sql_query = "SELECT * FROM `current_ga` WHERE allycode="
		+parseInt(allycode)+" AND round<>0 ORDER BY round DESC LIMIT 12;"
	console.log(logPrefix()+"SQL: "+sql_query);

	message.channel.send("Looking for DB stats for GAs for the ally: "+allycode+"...")
		.then(msg => {
			db_pool.query(sql_query, function(exc, result) {
				if (typeof(msg.delete)==="function") msg.delete();

				if (exc) {
					let otd = exc.sqlMessage? exc.sqlMessage: exc; // object to display

					// console.log("SQL:", sql);
					console.log(logPrefix()+"getPlayerGAs Exception:", otd);
					return;
				}

				if (result.length == 0) {
					msg = "No GA data registered. Try j.gar command."
					console.warn(logPrefix()+"msg");
					message.reply(msg);
					return;
				}

				if (typeof(callback)==="function") callback(player, message, result);
			});
		}).catch(console.error);
}

/** Get the player's stats from the latest GA
 * @param {object} player The target player
 * @param {object} message The origin message (request)
 */
exports.getPlayerStatsFromLatestGA = function(player, message, callback) {
	let allycode = player.allycode;
	let sql_query = "SELECT * FROM `current_ga` WHERE allycode="
		+parseInt(allycode)+" AND round<>0 ORDER BY round DESC LIMIT 1;"
	console.log(logPrefix()+"SQL: "+sql_query);

	message.channel.send("Looking for DB stats for the latest GA for the ally: "+allycode+"...")
		.then(msg => {
			db_pool.query(sql_query, function(exc, result) {
				if (typeof(msg.delete)==="function") msg.delete();

				if (exc) {
					let otd = exc.sqlMessage? exc.sqlMessage: exc; // object to display

					// console.log("SQL:", sql);
					console.log(logPrefix()+"getPlayerStatsFromLatestGA Exception:", otd);
					return;
				}

				if (result.length == 0) {
					msg = "No GA data registered. Try j.gar command."
					console.warn(logPrefix()+"msg");
					message.reply(msg);
					return;
				}

				if (typeof(callback)==="function") callback(player, message, result[0]);
			});
		}).catch(console.error);
}

/** Get the division in GA from the given GP
 * @param  {number} gp GP of the player
 * @return {number} Division number between 0 & 10 included
 */
function getDivFromGP(gp) {
	let div = -1;
	let gpm = gp / 1e6; // Same GP but in M

	if (gpm < 1) {
		div = 0
	} else if (gpm < 1.6) {
		div = 10
	} else if (gpm < 2.3) {
		div = 9
	} else if (gpm < 3.1) {
		div = 8
	} else if (gpm < 3.85) {
		div = 7
	} else if (gpm < 4.5) {
		div = 6
	} else if (gpm < 5.15) {
		div = 5
	} else if (gpm < 6) {
		div = 4
	} else if (gpm < 6.65) {
		div = 3
	} else if (gpm < 7.8) {
		div = 2
	} else {
		div = 1
	}

	return div
}

/** Register player for the current GA in our database
 * @param {object} player The target player
 * @param {object} message The origin message (request)
 */
function registerPlayerForGrandArena(player, message) {
	let division = getDivFromGP(parseInt(player.gp));

	if ( !division ) {
		console.log(logPrefix()+"registerPlayerForGrandArena divsion calculation error.")
		message.reply(":red_circle: You must be over 1M GP to enter GA!");
		return;
	}

	console.log(logPrefix()+"GA Stats : gaTerritoriesDefeated : "
		+player.gaTerritoriesDefeated+ " - gaBannersEarned : "
		+player.gaBannersEarned+ " - gaFullCleardRoundWins : "
		+player.gaFullCleardRoundWins+ " - gaOffensiveBattles : "
		+player.gaOffensiveBattles+ " - gaSuccessfulDefends : "
		+player.gaSuccessfulDefends+ " - gaUndersizedSquadWins : "
		+player.gaUndersizedSquadWins+ " - gaScore : "
		+player.gaScore)

	let sql_query = "INSERT INTO `current_ga` "
		+ "(`allycode`, `division`, `type`, `round`, `ground_territory`"
		+ ", `fleet_territory`, `result`, `opponent_score`, `score`, `total_score`"
		+ ", `gl_faced`, `auto_def`, `defensive_win`, `undersize_win`"
		+", `total_defensive_win`, `total_undersize_win`)\n"
		+ "VALUES ("+parseInt(player.allycode)+", "+division+", 0, 0, 0, 0, 0, 0, 0, "
		+parseInt(player.gaBannersEarned)+", 0, 0, 0, 0, "+parseInt(player.gaSuccessfulDefends)
		+", "+parseInt(player.gaUndersizedSquadWins)+");"
	console.log(logPrefix()+"SQL: "+sql_query);

	db_pool.query(sql_query, function(exc, result) {
		if (exc) {
			let otd = exc.sqlMessage? exc.sqlMessage: exc; // object to display

			// console.log("SQL:", sql);
			console.log(logPrefix()+"registerPlayerForGrandArena Exception:", otd);
			return;
		} else {
			let n = result.affectedRows;
			console.log(logPrefix()+"%d record inserted.", n);
			message.channel.send("✅ "+player.name+" successfully registered for this GA.");

			return;
		}
	});
}

/** Store ga stats in our database
 * @param {object} player The target player
 * @param {object} message The origin message (request)
 */
exports.registerGrandArenaResult = function(player, message, initialValues) {
	// let initialValues = getInitializedGrandArenaValues(player.allycode);
	let input_data = player.ga_players_input;

	console.log(logPrefix()+"registerGrandArenaResult: getInitializedGrandArenaValues: "+initialValues.length);
	if (initialValues.length != 0) {
		if (parseInt(initialValues[0].gaBannersEarned) == parseInt(player.gaBannersEarned)) {
			message.channel.send(":red_circle: GA Data aren't updated yet, try again later.");
			return;
		} else {
			let computed_values = {
				'defensive_win': parseInt(player.gaSuccessfulDefends) - parseInt(initialValues[0].total_defensive_win),
				'undersize_win': parseInt(player.gaUndersizedSquadWins)-parseInt(initialValues[0].total_undersize_win),
				'score': parseInt(player.gaBannersEarned) - parseInt(initialValues[0].total_score),
				'round': parseInt(initialValues[0].round) + 1
			};

			console.log(logPrefix()+"registerGrandArenaResult: computed_values defensive win: "
				+computed_values.defensive_win);
			console.log(logPrefix()+"registerGrandArenaResult: computed_values undersize win: "
				+computed_values.undersize_win);
			console.log(logPrefix()+"registerGrandArenaResult: computed_values score: "
				+computed_values.score);
			console.log(logPrefix()+"registerGrandArenaResult: computed_values round: "
				+computed_values.round);

			let sql_query = "INSERT INTO `current_ga`\n"+
				"(`allycode`, `division`, `type`, `round`, `ground_territory`, `fleet_territory`,"+
				" `result`, `opponent_score`, `score`, `total_score`, `gl_faced`, `auto_def`, `defensive_win`,"+
				" `undersize_win`, `total_defensive_win`, `total_undersize_win`)\n"+
				"VALUES ("+parseInt(player.allycode)+", "+initialValues[0].division+" "
				+input_data.type+", "+computed_values.round+", "+input_data.ground_terr
				+", "+input_data.fleet_terr+", "+input_data.result+", "+input_data.opp_score
				+", "+computed_values.score+", "+parseInt(player.gaBannersEarned)
				+", "+input_data.gl_faced+", "+input_data.auto_def
				+", "+computed_values.defensive_win+", "+computed_values.undersize_win
				+", "+parseInt(player.gaSuccessfulDefends)+", "+parseInt(player.gaUndersizedSquadWins)+");"
			console.log(logPrefix()+"SQL: "+sql_query);

			db_pool.query(sql_query, function(exc, result) {
				if (exc) {
					let otd = exc.sqlMessage? exc.sqlMessage: exc; // object to display

					// console.log("SQL:", sql);
					console.log(logPrefix()+"registerGrandArenaResult Exception:", otd);
					return;
				} else {
					let n = result.affectedRows;
					console.log(logPrefix()+"%d record inserted.", n);
					message.channel.send("✅ "+player.name+" successfully registered his results for this GA.");

					return;
				}
			});
		}
	} else {
		let msg = "No GA data registered. Try j.gar command."

		console.warn(logPrefix()+msg);
		message.reply(msg);

		return;
	}
}

/** Handle ga registration and results delivery in our database
 * @param {object} player The target player
 * @param {object} message The origin message (request)
 */
exports.grandArenaRegistration = function(player, message, registered) {
	let allycode = player.allycode;

	if (!allycode) {
		message.reply(":red_circle: Invalid or missing allycode!");
		return;
	}

	console.log(logPrefix()+"grandArenaRegistration : checkGrandArenaRegistration = "+JSON.stringify(registered));
	registered = registered[0].cnt;

	if (message.words.length == 0) {
		if (registered != 0) {
			message.reply(":red_circle: You are already registered for this GA!");
		} else {
			registerPlayerForGrandArena(player, message);
		}
		return;
	}

	if (message.words.length < 7 && message.words.length != 0) {
		let example = "Example: gar 5 1 2000 3 1 2 0";
		let usage = "Usage: gar <type 5 or 3)> <win = 1, loss = 0> <opponent score>"
			+ " <ground territory cleared> <fleet territory cleared> <GL faced> <auto defense (0 or 1)>";

		message.channel.send(":red_circle: "+usage);
		message.channel.send("👉 "+example);

		return;
	}

	if (registered == 0) {
		message.reply(":red_circle: You are not registered for this GA! Be on the lookout for the next one.");
		return;
	}

	let msg = "";
	let ga_type = message.words.shift();
	let ga_result = message.words.shift();
	let ga_opp_score = message.words.shift();
	let ga_ground_terr = message.words.shift();
	let ga_fleet_terr = message.words.shift();
	let ga_gl_faced = message.words.shift();
	let ga_auto_def = message.words.shift();

	if (!ga_type.match(/^[3]|[5]$/)) {
		msg = "Invalid ga type (not 3 or 5)!";
	}
	if (!ga_result.match(/^[0-1]$/)) {
		msg = "Invalid ga result (not 0 or 1)!";
	}
	if (!ga_opp_score.match(/^\d{1,4}$/)) {
		msg = "Invalid opponent score (not an integer < 5000)!";
	}
	if (!ga_ground_terr.match(/^[0-3]$/)) {
		msg = "Invalid ga ground territory cleared number (not an integer between 0 and 3)!";
	}
	if (!ga_fleet_terr.match(/^[0-1]$/)) {
		msg = "Invalid ga fleet territory cleared number (not an integer between 0 and 1)!";
	}
	if (!ga_gl_faced.match(/^[0-6]$/)) {
		msg = "Invalid ga Galactic Legend faced in defense number (not an integer between 0 and 6)!";
	}
	if (!ga_auto_def.match(/^[0-1]$/)) {
		msg = "Invalid ga auto defense indicator (not 0 or 1)!";
	}

	if (msg.trim()!=="") {
		console.log(msg);
		message.reply(msg);

		return;
	}

	let input_data = {
		'type': parseInt(ga_type),
		'result': parseInt(ga_result),
		'opp_score': parseInt(ga_opp_score),
		'ground_terr': parseInt(ga_ground_terr),
		'fleet_terr': parseInt(ga_fleet_terr),
		'gl_faced': parseInt(ga_gl_faced),
		'auto_def': parseInt(ga_auto_def)
	}

	player.ga_players_input = input_data;

	exports.getInitializedGrandArenaValues(player, message);

	return;
};
