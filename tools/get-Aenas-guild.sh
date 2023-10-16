#! env bash

datetime=`date +'%Y-%m-%d-%H%i'`

mkdir -p ../data/Private

./get-guild-units.py fZ0XBHiaTdiZqYFxS9aBfw > ../data/Private/$datetime-Fr_rebel_de_la_galaxie.csv
