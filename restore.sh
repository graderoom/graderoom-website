#!/bin/bash

# Define path to backup archives
DUMP_DIR="../mongodumps"

# Check if backup archives directory exists
if [ ! -d "$DUMP_DIR" ]; then
  echo "Error: $DUMP_DIR directory does not exist" >&2
  exit 1
fi

# Get list of backup archive files
BACKUP_FILES=($(ls -t "$DUMP_DIR"/*.gz))

# Check if any backup archive files exist
if [ ${#BACKUP_FILES[@]} -eq 0 ]; then
  echo "Error: No backup archive files found in $DUMP_DIR" >&2
  exit 1
fi

# Print menu of available backup archive files
echo "Available backup archive files:"
for i in $(seq 0 4); do
  if [ $i -lt ${#BACKUP_FILES[@]} ]; then
    SIZE=$(du -h "${BACKUP_FILES[$i]}" | awk '{print $1}')
    DATE=$(basename "${BACKUP_FILES[$i]}" | sed 's/^mongodump_//' | sed 's/\.gz$//')
    echo "  $i: ${BACKUP_FILES[$i]} ($SIZE, created $DATE)"
  fi
done

# Prompt user to select a backup archive file
echo "Enter the number of the backup archive file you want to restore:"
read -r BACKUP_INDEX

# Check if user input is valid
if [ $BACKUP_INDEX -lt 0 ] || [ $BACKUP_INDEX -ge ${#BACKUP_FILES[@]} ]; then
  echo "Error: Invalid backup archive file index" >&2
  exit 1
fi

# Prompt user to enter confirmation code
CONFIRM_CODE=$(openssl rand -base64 6)
echo "Are you sure you want to restore this backup archive file? Type the following confirmation code to proceed: $CONFIRM_CODE"
read -r INPUT_CODE

# Check if user input matches confirmation code
if [ "$INPUT_CODE" != "$CONFIRM_CODE" ]; then
  echo "Error: Invalid confirmation code" >&2
  exit 1
fi

# Extract selected backup archive file and restore its contents
mongorestore --gzip --archive="${BACKUP_FILES[$BACKUP_INDEX]}"
