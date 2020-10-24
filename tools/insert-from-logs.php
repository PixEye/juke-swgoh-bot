#!/bin/env php
<?php
// First version on 2020-08-31 by: PixEye@pixeye.net

$nl = PHP_EOL;
$input  = "./to-redo.txt";
$output = "./to-redo.sql";
if (!file_exists($input)) {
    fprintf(STDERR, 'Input file: "%s" does not exist!%s', $input, $nl);
    exit(1);
}

if (!is_readable($input)) {
    fprintf(STDERR, 'Cannot read input file: "%s"!%s', $input, $nl);
    exit(2);
}

$lines = file($input);
if ($lines === false) {
    fprintf(STDERR, 'Failed to open input file: "%s"!%s', $input, $nl);
    exit(3);
}

$stop = false;
$sql = "INSERT INTO `evols` (allycode, ts, type, new_value, unit_id) VALUES";
$unit_id = '';

forEach($lines as $i => $line) {
    ++$i;
    $type = 0;
    $line = trim($line);
    if ($line==='') continue; // ignore empty lines

    $Block = explode(' - ', $line);
    if (count($Block)!==2) {
        fprintf(STDERR, $nl.'Unexpected number of blocks (%d)%s', count($Block), $nl);
        printf('%s%s', $line, $nl.$nl);

        $Word = explode(' ', $line);
        if ($Word[0]!=='SQL:' && $Word[1]!=='Exception') {
            exit(4);
        }
        continue;
    }

    // Data to get: ts, allycode, unit_id, new_value, type
    // Possible types are: new, newGifts, gear, relic, star, zeta

    $logDate = array_shift($Block);
    // printf('%s%3d/ Log date: %s%s', $nl, $i, $logDate, $nl);
    $ts = strToTime($logDate);
    if (!is_numeric($ts) || $ts<=0) $stop = true;

    $Word = explode(' ', array_shift($Block));
    // now $Block should be empty

    $wc = count($Word); // word count
    // printf('%d other words: %s%s', $wc, implode(' ', $Word), $nl);

    // if ($i>9) break;

    $firstWord = $Word[0];
    $lastWord = $Word[$wc-1];

    switch($firstWord) {
    case 'Ally':
        $allycode = $Word[3];
        $Part = explode(" code $allycode is: ", $line);
        $user = $Part[1];
        printf('%3d/ %s + allycode: %s / name: %s%s', $i, $logDate, $allycode, $user, $nl);
        // printf('%s%s', $line, $nl.$nl); // debug
        if (!is_numeric($allycode) || is_numeric($user)) $stop = true;
        break;

    case 'Old':
    case 'Periodical':
    case 'There':
    case 'UC':
        break; // ignore

    case 'Evolution:':
        $beforeLastWord = $Word[$wc-2];

        switch($beforeLastWord) {
        case 'unlocked':
            $type = 'new';
            $unit_id = $lastWord;
            printf('%3d/ %s + %s has %s (unit): %s%s', $i, $logDate, $user, $type, $unit_id, $nl);
            if (is_numeric($unit_id) || trim($unit_id)==='') $stop = true;
            break;

        default:
            $unit_id = $Word[$wc-4];

            switch($lastWord) {

            case 'G12': g(12); break; // new gear
            case 'G13': g(13); break;

            case 'R1': r(1); break; // new relic
            case 'R2': r(2); break;
            case 'R3': r(3); break;
            case 'R4': r(4); break;
            case 'R5': r(5); break;
            case 'R6': r(6); break;
            case 'R7': r(7); break;

            case '1*': s(1); break; // new star
            case '2*': s(2); break;
            case '3*': s(3); break;
            case '4*': s(4); break;
            case '5*': s(5); break;
            case '6*': s(6); break;
            case '7*': s(7); break;

            case 'gift(s)':
                $type = 'newGifts';
                $unit_id = '';
                $val = $Word[$wc-3];
                printf('%3d/ %s + %s made %d %s%s', $i, $logDate, $user, $val, $type, $nl);
                // printf('%s%s', $line, $nl.$nl); // debug
                if ($val<=0) $stop = true;
                break;

            case 'zeta(s)':
                $type = 'zeta';
                $unit_id = $Word[$wc-5];
                $val     = $Word[$wc-2];
                printf('%3d/ %s + %s add %s #%d on %s%s', $i, $logDate, $user, $type, $val, $unit_id, $nl);
                // printf('%s%s', $line, $nl.$nl); // debug
                if ($val<=0 || $val>6) $stop = true;
                break;

            default:
                fprintf(STDERR, $nl.'Unexpected last word: "%s"!%s', $lastWord, $nl);
                printf('%d other words: %s%s', $wc, implode(' ', $Word), $nl);
                $stop = true;
            }
        }
        break;

    default:
        if (!is_numeric($firstWord) && $lastWord!=='ships') {
            fprintf(STDERR, $nl.'Unexpected first word: "%s"!%s', $firstWord, $nl);
            printf('%d other words: %s%s', $wc, implode(' ', $Word), $nl);
            $stop = true;
        }
    }

    if (!$val || !$type) continue;

    if (strLen($unit_id)>32) $stop = true;

    if ($stop) {
        fprintf(STDERR, "Stopped!%s", $nl);
        break;
    }

    // "INSERT INTO `evols` (allycode, ts, type, new_value, unit_id) VALUES";
    $logDate = date("Y-m-d H:i:s", $ts);
    $sql .= "\n ($allycode, \"$logDate\", \"$type\", $val, \"$unit_id\"),";
}

if (!$stop) {
    $sql = rtrim($sql, ',');
    $isOk = file_put_contents($output, $sql);
    if (!$isOk) {
        fprintf(STDERR, 'Failed to write output file: "%s"!%s', $output, $nl);
        exit(99);
    }

    printf('Wrote output file: %s%s', $output, $nl);
}

function g($gear) {
    global $i, $line, $logDate, $nl, $user, $type, $unit_id, $val, $wc, $Word;

    $type = 'gear';
    $val  = $gear;
    printf("%3d/ %s + %s's %s is now %s %d%s", $i, $logDate, $user, $unit_id, $type, $val, $nl);
}

function r($relic) {
    global $i, $line, $logDate, $nl, $user, $type, $unit_id, $val, $wc, $Word;

    $type = 'relic';
    $val  = $relic;
    printf("%3d/ %s + %s's %s is now %s %d%s", $i, $logDate, $user, $unit_id, $type, $val, $nl);
    // printf('%s%s', $line, $nl.$nl); // debug
}

function s($star) {
    global $i, $line, $logDate, $nl, $user, $type, $unit_id, $val, $wc, $Word;

    $type = 'star';
    $val  = $star;
    printf("%3d/ %s + %s's %s has now %d %s(s)%s", $i, $logDate, $user, $unit_id, $val, $type, $nl);
    // printf('%s%s', $line, $nl.$nl); // debug
}

printf("The end.%s", $nl);
exit(0); // Success
