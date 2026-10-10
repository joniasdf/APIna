#!/bin/sh
cd "$(dirname "$0")"
command -v python3 >/dev/null 2>&1 || { echo "Asenna Python 3: https://www.python.org/downloads/"; exit 1; }
exec python3 setup_tesla.py "$@"
