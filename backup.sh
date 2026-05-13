#!/bin/bash

# Get the current date and time in YYYY-MM-DD-HH-MM-SS-MS format
DATE=$(date +%Y-%m-%d-%H-%M-%S-%3N)

# Set the backup directory name
BACKUP_DIR="$HOME/mongodumps"

# Create the backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Use mongodump to create backups of all databases
mongodump --out $BACKUP_DIR/"$DATE" --gzip

# Upload to Google Drive
PARENT_ID=$(cat ~/.gdrive/parent_id)
/usr/local/bin/gdrive files upload --parent "$PARENT_ID" --recursive $BACKUP_DIR/"$DATE"

# Delete backups older than 7 days
find $BACKUP_DIR -maxdepth 1 -type d -mtime +7 -exec rm -rf {} +
