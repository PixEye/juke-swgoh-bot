// fix-json-case.js
//
// Use it with NodeJS
//
// @since  2020-11-03
// @author PixEye at PixEye.net
//
// jshint esversion: 8

const locutus = require("../src/locutus"); // Functions from locutus.io

let argv = process.argv.slice(1); // remove first "node" argument
const cmd = argv.shift(); // get the command name (with full path)
const argc = argv.length;

if (argc < 1 || argc > 2 || argv[0]==="-h" || argv[0]==="--help") {
	const path = require('path'); // Path module

	console.log("Usage:\n\t"+"node %s <input-file.json> [<destination-file.json>]", path.basename(cmd));
	return;
}

const fs = require('fs'); // File system module

fs.readFile(argv[0], function(err, fcontent) {
	if (err) throw err;

	console.log("File content weights: %d bytes.", fcontent.length);
	const inputObj = JSON.parse(fcontent);
	let outputObj = {};

	Object.keys(inputObj).forEach(key => {
		let val = inputObj[key];

		outputObj[key] = locutus.ucwords(val.toLowerCase());
	});

	const json = JSON.stringify(outputObj, null, "\t");
	console.log("New JSON content weights: %d bytes.", json.length);

	if (argc < 2) {
		let jsonPreview = json.substr(0, 256);
		console.log("New JSON preview:\n%s", jsonPreview);
		return;
	}

	fs.writeFile(argv[1], json, function (err) {
		if (err) throw err;

		console.log('New JSON saved in: %s', argv[1]);
	});
});

// vim: noexpandtab shiftwidth=4 softtabstop=4 tabstop=4
