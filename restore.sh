#!/bin/bash

  # Set the backup directory name
  BACKUP_DIR="../mongodumps"

  # Check if the backup directory exists
  if [ ! -d "$BACKUP_DIR" ]; then
    echo "Backup directory not found: $BACKUP_DIR"
    exit 1
  fi

  # Get a list of all backup directories
  BACKUP_DIRS=()
  while IFS='' read -r DIR; do BACKUP_DIRS+=("$DIR"); done < <(find "$BACKUP_DIR"/* -maxdepth 0 -type d | sort -r)

  # Check if there are any backup directories
  if [ ${#BACKUP_DIRS[@]} -eq 0 ]; then
    echo "No backup directories found in: $BACKUP_DIR"
    exit 1
  fi

  # Print the 5 most recent backup directories with their dates in a table
  echo "Choose a backup to restore:"
  printf "%-4s %-25s\n" "#" "Date/Time"
  printf "%-4s %-25s\n" "--" "-------------------------"
  for i in "${!BACKUP_DIRS[@]}"; do
    if [ "$i" -eq 5 ]; then
      break
    fi
    DATE=$(basename "${BACKUP_DIRS[$i]}")
    printf "%-4s %-25s\n" "$((i+1))" "$DATE"
  done

  # Ask the user to select a backup directory to restore
  read -r -p "Enter the number of the backup to restore (or 'q' to quit): " BACKUP_NUM

  if [[ "$BACKUP_NUM" == "q" ]]; then
      exit 0
  fi

  # Check if the selected backup number is valid
  if [[ ! "$BACKUP_NUM" =~ ^[0-9]+$ ]] || ((BACKUP_NUM <= 0 || BACKUP_NUM > ${#BACKUP_DIRS[@]})); then
    echo "Invalid backup number: $BACKUP_NUM"
    exit 1
  fi

  # Set the selected backup directory
  SELECTED_BACKUP_DIR=${BACKUP_DIRS[$((BACKUP_NUM-1))]}

  # List the databases in the selected backup directory
  DB_NAMES=()
  while IFS='' read -r DIR; do DB_NAMES+=("$(basename "$DIR")"); done < <(find "$SELECTED_BACKUP_DIR"/* -type d)
  if [ ${#DB_NAMES[@]} -eq 0 ]; then
    echo "No backup files found in directory: $SELECTED_BACKUP_DIR"
    exit 1
  fi

  printf "%-4s %-25s\n" "#" "Database Name"
  printf "%-4s %-25s\n" "--" "-------------------------"
  for i in "${!DB_NAMES[@]}"; do
    DB_NAME="${DB_NAMES[$i]}"
    printf "%-4s %-25s\n" "$((i+1))" "$DB_NAME"
  done

  # Prompt the user to choose which database(s) to restore
  read -r -p "Enter the numbers(s) of the database(s) to restore (comma-separated, no spaces): " DB_INDICES

  # Convert the comma-separated list of database names to an array
  IFS=',' read -r -a DB_ARRAY <<< "$DB_INDICES"
  if [ ${#DB_ARRAY[@]} -eq 0 ]; then
    echo "No databases specified"
    exit 1
  fi

  # Check if the selected db numbers are valid
  for DB_NUM in "${DB_ARRAY[@]}"; do
    if [[ ! "$DB_NUM" =~ ^[0-9]+$ ]] || ((DB_NUM <= 0 || DB_NUM > ${#DB_NAMES[@]})); then
      echo "Invalid db number: $DB_NUM"
      exit 1
    fi
  done

  for DB_NUM in "${DB_ARRAY[@]}"; do
    DB_NAME=${DB_NAMES[$((DB_NUM-1))]}
    COLLECTION_NAMES=()
    while IFS='' read -r COLLECTION; do COLLECTION_NAMES+=("$(basename "$COLLECTION" | sed 's/\.bson\.gz$//' )"); done < <(find "$SELECTED_BACKUP_DIR"/"$DB_NAME"/*".bson.gz" -type f)
    printf "%-30s\n" "Database $DB_NAME"
    printf "%-4s %-25s\n" "#" "Collection Name"
    printf "%-4s %-25s\n" "--" "-------------------------"
    for i in "${!COLLECTION_NAMES[@]}"; do
      COLLECTION_NAME="${COLLECTION_NAMES[$i]}"
      printf "%-4s %-25s\n" "$((i+1))" "$COLLECTION_NAME"
    done

    # Prompt the user to choose which database(s) to restore
    read -r -p "Enter the numbers(s) of the collection(s) to restore (comma-separated, no spaces) or 'a' for all: " COLLECTION_INDICES

    COLLECTION_ARRAY=()
    if [ "$COLLECTION_INDICES" = "a" ]; then
      for i in "${!COLLECTION_NAMES[@]}"; do
        COLLECTION_ARRAY+=("$((i+1))")
      done
    else
      IFS=',' read -r -a COLLECTION_ARRAY <<< "$COLLECTION_INDICES"
      if [ ${#COLLECTION_ARRAY[@]} -eq 0 ]; then
        echo "No collections specified"
        exit 1
      fi

      # Check if the selected db numbers are valid
      for COLLECTION_NUM in "${COLLECTION_ARRAY[@]}"; do
        if [[ ! "$COLLECTION_NUM" =~ ^[0-9]+$ ]] || ((COLLECTION_NUM <= 0 || COLLECTION_NUM > ${#COLLECTION_NAMES[@]})); then
          echo "Invalid collection number: $COLLECTION_NUM"
          exit 1
        fi
      done
    fi

    # Generate a random 4-digit code
    CODE=$((1000 + RANDOM % 9000))

    # Prompt the user to enter the code for verification
    echo "You are about to restore ${#COLLECTION_ARRAY[@]} collections in $DB_NAME from $SELECTED_BACKUP_DIR"
    echo "Please enter the following code to verify: $CODE"
    read -r USER_CODE

    # Verify the user's input
    if [[ $USER_CODE -eq $CODE ]]; then
      echo "Verification successful"
      for i in "${!COLLECTION_ARRAY[@]}"; do
        COLLECTION_NAME="${COLLECTION_NAMES[$i]}"
        echo "Restoring $DB_NAME.${COLLECTION_NAME//./\\\.} from $SELECTED_BACKUP_DIR/$DB_NAME/$COLLECTION_NAME.bson.gz"
        mongorestore --gzip --nsInclude "$DB_NAME.${COLLECTION_NAME//./\\\\\\\\.}" "$SELECTED_BACKUP_DIR/$DB_NAME/$COLLECTION_NAME.bson.gz" --drop
      done
    else
      echo "Verification failed"
    fi
  done
