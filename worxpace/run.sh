#!/bin/sh
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

docker build -t worxpace "$REPO_ROOT/worxpace"
docker run --rm -v "$REPO_ROOT:/repo" -v /var/run/docker.sock:/var/run/docker.sock -e HOST_REPO_ROOT="$REPO_ROOT" worxpace "$@"
