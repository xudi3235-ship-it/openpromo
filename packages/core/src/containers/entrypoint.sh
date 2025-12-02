#!/bin/sh
set -e

R2_BUCKET="${R2_BUCKET:-openpromo-bucket}"
R2_MOUNT_PATH="${R2_MOUNT_PATH:-/openpromo-bucket}"
R2_ENDPOINT="${R2_ENDPOINT:-}"

if [ -z "$R2_ENDPOINT" ] && [ -n "$R2_ACCOUNT_ID" ]; then
  R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
fi

if [ -z "$R2_ENDPOINT" ]; then
  # Fall back to the known hostname used in Python helpers.
  R2_ENDPOINT="https://095f96ce70e75bbf88dea585b6a320a5.r2.cloudflarestorage.com"
fi

if [ -c /dev/fuse ] && [ -r /dev/fuse ]; then
  echo "Mounting R2 bucket ${R2_BUCKET} to ${R2_MOUNT_PATH} via tigrisfs (endpoint: ${R2_ENDPOINT})"
  mkdir -p "$R2_MOUNT_PATH"
  # allow_other requires fuse.conf entry; safe in container
  echo "user_allow_other" > /etc/fuse.conf
  /usr/local/bin/tigrisfs --endpoint "$R2_ENDPOINT" -f "$R2_BUCKET" "$R2_MOUNT_PATH" &
  # Give the mount a moment to be ready.
  sleep 2
  echo "Contents of mounted bucket (if mount succeeded):"
  ls -lah "$R2_MOUNT_PATH" || true
  if ! mountpoint -q "$R2_MOUNT_PATH"; then
    echo "R2 mount not active; continuing with S3 API fallback only."
  fi
else
  echo "FUSE device not available or not permitted; skipping mount and using S3 API fallback only."
fi

exec /app/server
