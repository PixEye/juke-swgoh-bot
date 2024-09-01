<?php
$eol = PHP_EOL;
if (!isSet($argv)) {
	echo 'This is a CLI only script', $eol;
	exit(1);
}

$colSep = ',';
$cols = ['code', 'name'];
$inputFile = $argv[1];

$fContent = file_get_contents($inputFile);
if ($fContent===false) {
	die("Cannot read '$fContent'!".$eol);
}

$list = json_decode($fContent, true);
if (json_last_error()!==JSON_ERROR_NONE) {
	die('Cannot JSON decode: '.json_last_error_msg().$eol);
}

ksort($list);

$headers = implode($colSep, $cols);
echo $headers, $eol;

forEach ($list as $code => $name) {
	echo $code, $colSep, $name, $eol;
}
