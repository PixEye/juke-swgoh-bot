#! env bash

datetime=`date +'%Y-%m-%d-%H%M'`

mkdir -p ../data/Private

./get-guild-units.py fZ0XBHiaTdiZqYFxS9aBfw > ../data/Private/$datetime-Fr_rebel_de_la_galaxie.csv
