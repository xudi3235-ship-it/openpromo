#!/bin/bash
set -e

TMPFILE=$(mktemp)
if [ -z "${SST_STAGE}" ]; then
    echo "Error: SST_STAGE environment variable is not set."
    exit 1
fi
STAGE="${SST_STAGE}"

doppler secrets download --format=env --no-file > "$TMPFILE"
pnpm pnpm sst secret load "$TMPFILE" --stage="$STAGE"
rm "$TMPFILE"
