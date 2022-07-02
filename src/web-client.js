/**
 * @since 2021-04-04
 * @author pix@pixeye.net
 */

// Modules and other constants:
const HTML_PARSER = require("node-html-parser");
const LOCUTUS = require("./locutus");
const SEP_LEN = 99;
const TOOLS = require("./tools");
const WEB = require("https");

// Source pages:
// const WARSTATS_TOP_GUILDS = "https://goh.warstats.net/?sort=tw&direction=asc";
// const PROXIMA_GUILDS = "https://goh.warstats.net/15/ProXima";
// const SWGOH_TOP_GUILDS = "https://swgoh.gg/g/";
const BASE_SPEED_OF_TOONS = "https://swgoh.gg/characters/stats/#2";

exports.parseSwgohGgGuildList = function(html, result, chunkCnt) {
	var fileSize = html.length;

	if (result.statusCode !== 200) {
		console.warn("wget failed!");
		return;
	}

	console.log("%sB read in %d chunk(s)", TOOLS.eng_format(fileSize), chunkCnt);

	const isValid = HTML_PARSER.valid(html);

	console.log("HTML page is valid?", isValid? "true": "false");
	if (!isValid) return;

	const Doc = HTML_PARSER.parse(html);
	const Title =
		Doc.querySelector("html>head>title").text.trim();

	const DataNodes =
		Doc.querySelectorAll("div.content-container-primary>ul>li.p-0>a>*");
	const Headers = ["Picture", "Name", "Descr.", "Stats"];
	const Stats = ["Raid points", "Members", "Profiles", "Avg arena rank", "GP"];

	const NbHeaders = Headers.length;
	const NbDataBlocks = DataNodes.length;

	console.log("Page title:", Title);
	console.log("Nb data blocks:", NbDataBlocks);
	console.log("Nb cells found:", DataNodes.length);

	var colNum = 0;
	var i = 0;

	i = 0;
	console.log("=".repeat(SEP_LEN)); // ===== ===== ===== ======
	DataNodes.forEach(node => {
		var colName = Headers[i % NbHeaders];
		var txt = node.text.trim().replace(/\s+/g, " ");

		if (!colNum++) { ++i; return; }

		if (colName === "Name") {
			txt = node.querySelector("h3").text.trim().replace(/\s+/g, " ");
		} else
		if (colName === "Stats") {
			let stats = node.querySelectorAll("strong");

			txt = [];
			stats.forEach((stat, j) => {
				let v = (Stats[j] === "GP")? Math.round(stat.text / 1e6)+"M": stat.text;
				txt.push(Stats[j] + ": " + v);
			});
			txt = "(" + stats.length + ") " + txt.join("; ");
		}

		console.log("Cell %d/col %d - %s: %s", ++i, colNum, colName, txt);

		if (i % NbHeaders === 0 && i>0) {
			console.log("-".repeat(SEP_LEN)); // ----- ----- -----
			colNum = 0;
		}
	});
};

exports.parseSwgohGgToonList = function(html, result, chunkCnt) {
	var fileSize = html.length;

	if (result.statusCode !== 200) {
		console.warn("wget failed!");
		return;
	}

	console.log("%sB read in %d chunk(s)", TOOLS.eng_format(fileSize), chunkCnt);

	const isValid = HTML_PARSER.valid(html);

	console.log("HTML page is valid?", isValid? "true": "false");
	if (!isValid) return;

	const Doc = HTML_PARSER.parse(html);
	const Title =
		Doc.querySelector("html>head>title").text.trim();

	const DataBlock = Doc.querySelector("table#characters");
	const Headers = DataBlock.querySelectorAll("th");
	const ToonLines = DataBlock.querySelectorAll("tbody tr");

	const NbHeaders = Headers.length;
	const NbToons = ToonLines.length;

	console.log("Page title:", Title);
	console.log("Nb columns:", NbHeaders);
	console.log("Nb toons:", NbToons);

	console.log("=".repeat(SEP_LEN)); // ===== ===== ===== ======
	let i = 0;
	ToonLines.forEach(line => {
		let colNum = 0;
		let dataNodes = line.querySelectorAll("td");
		let toon = {};

		dataNodes.forEach(node => {
			var colName = Headers[colNum++].text;
			var txt = node.text.trim().replace(/\s+/g, " ");

			if (colNum === 1) colName = "Name";
			toon[colName] = txt;
			if (colNum === 4) {
				console.log("%d/ %s", ++i, JSON.stringify(toon));
			}
		});
	});
};

exports.parseWarstatsGuildList = function(html, result, chunkCnt) {
	var fileSize = html.length;

	if (result.statusCode !== 200) {
		console.warn("wget failed!");
		return;
	}

	console.log("%sB read in %d chunk(s)", TOOLS.eng_format(fileSize), chunkCnt);

	const isValid = HTML_PARSER.valid(html);

	console.log("HTML page is valid?", isValid? "true": "false");
	if (!isValid) return;

	const Doc = HTML_PARSER.parse(html);
	const Title =
		Doc.querySelector("html>head>title").text.trim();

	const Headers =
		Doc.querySelectorAll("table.highlight>thead th");
	const NbDataBlocks =
		Doc.querySelectorAll("table.highlight>tbody tr").length;
	const DataNodes =
		Doc.querySelectorAll("table.highlight>tbody td");
	const NbCols = Headers.length;

	console.log("Page title:", Title);
	console.log("Nb columns found:", NbCols);
	console.log("Nb data blocks:", NbDataBlocks);
	console.log("Nb cells found:", DataNodes.length);

	var colTitles = [];
	var i = 0;
	console.log("=".repeat(SEP_LEN)); // ===== ===== ===== ======

	Headers.forEach(node => {
		var txt = node.text.trim().replace(/\s+/g, " ");

		colTitles.push(txt);
		console.log("Column %d contains: %s", ++i, txt);
	});
	console.log("=".repeat(SEP_LEN)); // ===== ===== ===== ======

	var colNum = 0;
	i = 0;
	DataNodes.forEach(node => {
		var colName = colTitles[colNum];
		var txt = node.text.trim().replace(/\s+/g, " ");

		if (!colNum++) { ++i; return; }

		console.log("Cell %d/col %d (%s) contains: %s", ++i, colNum, colName, txt);
		if (colName==="Guild") {
			let txt2 = LOCUTUS.utf8_decode(txt);

			if (txt2!==txt) {
				console.log("Cell %d/col %d (%s) contained UTF-8: %s", i, colNum, colName, txt2);
			}
		}

		if (i % NbCols === 0 && i>0) {
			console.log("-".repeat(SEP_LEN)); // ----- ----- -----
			colNum = 0;
		}
	});
};

exports.wget = function(url, callback) {
	WEB.get(url, function(res) {
		var webContent = "";
		var chunkCnt = 0;

		console.log("Got response code %d from %s", res.statusCode, url);
		// console.log("Web headers:", res.headers);

		res.on("data", function(chunk) {
			++chunkCnt;
			webContent += chunk;
		});

		res.on("end", function() {
			if (typeof callback === "function") {
				callback(webContent, res, chunkCnt);
			}
		});
	}).on("error", function(e) {
		console.log("Got error: " + e.message);
	});
};

// exports.wget(PROXIMA_GUILDS, exports.parseWarstatsGuildList);
// exports.wget(SWGOH_TOP_GUILDS, exports.parseSwgohGgGuildList);
exports.wget(BASE_SPEED_OF_TOONS, exports.parseSwgohGgToonList);

// vim: noexpandtab
