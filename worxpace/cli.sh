#!/bin/sh
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# worxpace runs inside an Alpine container, so it cannot see the real platform. Detect it here
# and pass it in, normalised to the values Node and package.json use.
HOST_OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
case "$(uname -m)" in
  arm64 | aarch64) HOST_ARCH=arm64 ;;
  x86_64 | amd64) HOST_ARCH=x64 ;;
  *) HOST_ARCH="$(uname -m)" ;;
esac
# Only Linux has a libc distinction, so elsewhere the variable is not passed at all rather than
# passed empty — worxpace should see an absent value, not a blank one.
LIBC_ENV=""
if [ "$HOST_OS" = linux ]; then
  if ldd --version 2>&1 | grep -qi musl; then LIBC_ENV="-e HOST_LIBC=musl"; else LIBC_ENV="-e HOST_LIBC=glibc"; fi
fi

docker build -t worxpace "$REPO_ROOT/worxpace"
docker run --rm \
  -v "$REPO_ROOT:/repo" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e HOST_REPO_ROOT="$REPO_ROOT" \
  -e WORKING_DIR="${WORKING_DIR:-$REPO_ROOT}" \
  -e HOST_OS="$HOST_OS" \
  -e HOST_ARCH="$HOST_ARCH" \
  $LIBC_ENV \
  worxpace "$@"
