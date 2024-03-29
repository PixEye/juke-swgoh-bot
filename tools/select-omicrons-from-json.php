#!/bin/env php
<?php
$cmd = array_shift($argv); // get the command name (with full path)
$nl = PHP_EOL;

$argc = count($argv);
if (!$argc || $argc>2 || $argv[0]==="-h" || $argv[0]==="--help") {
	$cmd = basename($cmd);
	$usage = "$cmd <file-to-indent.json> [<file-to-save-cleaner.json>]";
	fprintf(STDERR, "Usage:\n\t%s%s", $usage, $nl);
	exit(1);
}

$fContent = file_get_contents($argv[0], true);
$err = ($fContent === false);
if ($err) {
	fprintf(STDERR, "Cannot read file '%s'!%s", $argv[0], $nl);
	exit(2);
}

if (trim($fContent)==='') {
	fprintf(STDERR, "The file '%s' is empty!%s", $argv[0], $nl);
	exit(3);
}

$abilities = json_decode($fContent, false); // to array of objects
if ($abilities===null) {
	fprintf(STDERR, "The file '%s' does not contain valid JSON!%s", $argv[0], $nl);
	exit(4);
}

/** Convert a number into the engineer notation
 * @param  int $number   A number
 * @param  int $decimals Optional number of decimals
 * @return string
 */
function engineer_format($number, $decimals = 0) {
	$units = ' KMGTP';
	$factor = floor((strlen($number) - 1) / 3);
	$unit = subStr($units, $factor, 1);

	return trim(sprintf("%.{$decimals}f", $number / pow(1024, $factor)) . $unit);
}

if (!is_array($abilities)) {
	fprintf(STDERR, "File '%s' does not contain an array: %s%s", $argv[1], getType($abilities), $nl);
	exit(5);
}

$new_data = [];
forEach ($abilities as $i => $ability) {
	if ($ability->is_omicron) {
		unset($ability->description); // save memory
		$new_data[] = $ability;
	}
	unset($abilities[$i]); // free some memory
}

$raw_json = json_encode($new_data, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES);
$json = str_replace('    ', "\t", $raw_json);
if ($argc>1) {
	$fs1 = engineer_format(strLen($raw_json));
	printf("First JSON takes %s.%s", $fs1, $nl);

	$fs2 = engineer_format(strLen($json));
	printf("JSON with tabs instead of spaces takes %s.%s", $fs2, $nl);

	$byteCount = file_put_contents($argv[1], $json);
	if (!$byteCount) {
		fprintf(STDERR, "Cannot write to file '%s'!%s", $argv[1], $nl);
		exit(9);
	}

	$size = engineer_format($byteCount);
	printf("Wrote to file '%s'%s.%s", $argv[1], " ($size)", $nl);
} else {
	print($json.$nl);
}
exit(0); // success

// vim: noexpandtab
