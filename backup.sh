#!/bin/bash

DATE=$(date +"%Y-%m-%d_%H-%M-%S")
DUMP_DIR="../mongodumps"

if [ -d "$DUMP_DIR" ]; then
  mongodump --gzip --archive="$DUMP_DIR/mongodump_$DATE.gz"
else
  echo "Error: $DUMP_DIR directory does not exist" >&2
  exit 1
fi
