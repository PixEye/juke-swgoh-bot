#!/bin/sh

pauseInSec=1
src_dir=`dirname "$0"`
cd "$src_dir/.." || exit $?

while true # infinite loop to run it again after a fatal error
do
	echo "Update the code..."
	git pull || exit $?

	echo
	echo "Wait $pauseInSec second..."
	sleep $pauseInSec

	echo
	date > ~/last-start.txt
	node src

	echo "Exit code was: $?"
done

# vim: noexpandtab
