#!/usr/bin/env bash

rm -rf test-files/*

COUNT=${1:-10}
MAXSIZE_MB=${2:-400}

for i in $(seq 1 $COUNT)
do
    SIZE=$(( ( RANDOM % $MAXSIZE_MB )  + 1 ))

    WORD1=$( shuf -n1  /usr/share/dict/words )
    WORD2=$( shuf -n1  /usr/share/dict/words )

    truncate -s "$SIZE"M "test-files/"$i"-$WORD1-$WORD2-$SIZE""MB.txt"
done
