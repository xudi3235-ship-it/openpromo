#!/bin/bash
set -e

TMPFILE=$(mktemp)

doppler secrets download --format=env --no-file > "$TMPFILE"
pnpm pnpm sst secret load "$TMPFILE"
rm "$TMPFILE"
