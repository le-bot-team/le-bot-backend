#!/bin/sh
set -e

# Push database schema to ensure tables exist
bun --bun drizzle-kit push --config ./drizzle.config.ts

# Start the compiled server
exec ./server
