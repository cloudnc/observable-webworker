#!/usr/bin/env bash

rm -rf test-files/*

for i in {1..20}
do
    SIZE=$(( ( RANDOM % 100 )  + 1 ))

    WORD1=$( shuf -n1  /usr/share/dict/words )
    WORD2=$( shuf -n1  /usr/share/dict/words )

    truncate -s "$SIZE"M "test-files/"$i"-$WORD1-$WORD2-$SIZE""MB.txt"
done
