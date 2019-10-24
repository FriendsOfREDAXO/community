#!/bin/bash

set -o errexit -o nounset

cd _directory/data/

for d in */ ; do
	directory=$(stat -f "$d")
    echo "${directory%/}: $(git log -1 --format=%at -- "$directory")" >> ./../../_data/last-modified.yml
done
