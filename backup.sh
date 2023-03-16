#!/bin/bash

# Get the current date and time in YYYY-MM-DD-HH-MM-SS-MS format
DATE=$(date +%Y-%m-%d-%H-%M-%S-%3N)

# Set the backup directory name
BACKUP_DIR="../mongodumps"

# Create the backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Use mongodump to create backups of all databases
mongodump --out $BACKUP_DIR/"$DATE" --gzip

# Upload to Google Drive
PARENT_ID="1CpQ9tMMGKVOdGup8-u_a8bGfizItJFE5"
gdrive upload --parent $PARENT_ID $BACKUP_DIR/"$DATE" --recursive
