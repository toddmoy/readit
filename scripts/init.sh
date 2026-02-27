#!/bin/bash
# Creates required directories

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."

mkdir -p "$ROOT_DIR/books"
mkdir -p "$ROOT_DIR/certs"
