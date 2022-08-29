#!/bin/sh

src_dir=`dirname "$0"`
cd "$src_dir/.." || exit $?

while true # infinite loop to run it again after a fatal error
do
	git pull || exit $?
	sleep 1
	date > ~/last-start.txt
	node src
done

# vim: noexpandtab
