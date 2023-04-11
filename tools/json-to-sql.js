// json-to-sql.js
//
// Use it with NodeJS
//
// @since  2020-11-19
// @author PixEye at PixEye.net
//
// jshint esversion: 8

let argv = process.argv.slice(1); // remove first "node" argument
let table = 'unit_real_names';
const cmd = argv.shift(); // get the command name (with full path)
let argc = argv.length;

if (argc < 1 || argc > 4 || argv[0]==="-h" || argv[0]==="--help") {
	const path = require('path'); // Path module

	console.log("Usage:\n\t"+"node %s [-t <table-name>] <input-file.json> [<output-file.sql>]", path.basename(cmd));
	console.log("\nDefault table name is:", table);
	return;
}

const fs = require('fs'); // File system module

if (argv[0]==='-t') {
	argv.shift(); // forget "-t"
	table = argv.shift();
	argc -= 2;
}

fs.readFile(argv[0], function(err, fContent) {
	if (err) throw err;

	console.log("File content weights: %d bytes.", fContent.length);
	const inputObj = JSON.parse(fContent);
	let output = 'TRUNCATE `' + table + "`;\n\n";

	output += 'INSERT INTO `' + table + '` (uid, real_name) VALUES';
	Object.keys(inputObj).forEach(key => {
		let val = inputObj[key];

		// compute here:
		output+= "\n('"+key+"', \""+val+"\"),";
	});

	let len = output.length;
	console.log("New content weights: %d bytes.", len);

	if (argc < 2) return;

	output = output.substring(0, len - 1) + ';'; // replace last comma by semi-colon

	fs.writeFile(argv[1], output, function (err) {
		if (err) throw err;

		console.log('New JSON saved in: %s', argv[1]);
	});
});

// vim: noexpandtab
