#!/bin/env php
<?php
$cmd = array_shift($argv); // get the command name (with full path)
$nl = PHP_EOL;

$argc = count($argv);
if (!$argc || $argc>2 || $argv[0]==="-h" || $argv[0]==="--help") {
	$cmd = basename($cmd);
	$usage = "$cmd <file-to-indent.json> [<file-to-save-cleaner.json>]";
	fprintf(STDERR, "Usage:\n\t"."%s%s", $usage, $nl);
	exit(1);
}

$fcontent = file_get_contents($argv[0], true);
$err = ($fcontent === false);
if ($err) {
	fprintf(STDERR, "Cannot read file '%s'!%s", $argv[0], $nl);
	exit(2);
}

if (trim($fcontent)==='') {
	fprintf(STDERR, "The file '%s' is empty!%s", $argv[0], $nl);
	exit(3);
}

$obj = JSON_decode($fcontent);
if ($obj===null) {
	fprintf(STDERR, "The file '%s' does not contain valid JSON!%s", $argv[0], $nl);
	exit(4);
}

function human_filesize($bytes, $digits = 0) {
	$units = 'BKMGTP';
	$factor = floor((strlen($bytes) - 1) / 3);

	return sprintf("%.{$digits}f", $bytes / pow(1024, $factor)) . @$units[$factor];
}

// var_export($obj);
$json = json_encode($obj, JSON_PRETTY_PRINT);
if ($argc>1) {
	$fs1 = human_filesize(strLen($json));
	printf("First JSON takes %s.%s", $fs1, $nl);

	$json = str_replace('    ', "\t", $json);
	$fs2 = human_filesize(strLen($json));
	printf("JSON with tabs instead of spaces takes %s.%s", $fs2, $nl);

	$byteCount = file_put_contents($argv[1], $json);
	if (!$byteCount) {
		fprintf(STDERR, "Cannot write to file '%s'!%s", $argv[1], $nl);
		exit(5);
	}

	$size = human_filesize($byteCount);
	printf("Wrote to file '%s'%s.%s", $argv[1], " ($size)", $nl);
} else {
	print($json.$nl);
}
exit(0); // success

// vim: noexpandtab shiftwidth=4 softtabstop=4 tabstop=4
