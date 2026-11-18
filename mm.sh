#!/usr/bin/env bash
set -euo pipefail

# Prevent Git Bash (MSYS) from rewriting container paths; ignored on macOS/Linux
export MSYS_NO_PATHCONV=1

# Always run from the directory containing this script
cd "$(dirname "$0")"

usage() {
  echo "Usage: $0 {dev|build}" >&2
  echo "  dev    Serve the site at http://localhost:4000 with live reload" >&2
  echo "  build  Build the site to the _site directory" >&2
}

case "${1:-}" in
  dev)
    docker run --rm \
      --volume "$(pwd):/srv/jekyll" \
      --publish 4000:4000 \
      --publish 35729:35729 \
      jekyll/jekyll:pages \
      jekyll serve --host 0.0.0.0 --livereload --force-polling
    ;;
  build)
    docker run --rm \
      --volume "$(pwd):/srv/jekyll" \
      jekyll/jekyll:pages \
      jekyll build
    echo "" >&2
    echo "Site built to the _site directory." >&2
    ;;
  *)
    echo "Error: missing or unknown command '${1:-}'." >&2
    usage
    exit 1
    ;;
esac