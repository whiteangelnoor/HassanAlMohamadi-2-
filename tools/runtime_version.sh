#!/bin/sh
# Prints the native "runtime version": a hash of everything that ends up in
# the APK outside the JavaScript bundle. A JS bundle only runs on an APK with
# the same value, and CI builds a new APK only when it changes.
# AGPL-3.0-or-later.
set -e
cd "$(dirname "$0")/.."
git ls-files -s android shared specs assets package-lock.json tools/runtime_version.sh \
  | git hash-object --stdin | cut -c1-12
