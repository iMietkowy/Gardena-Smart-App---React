#!/usr/bin/env bash
# exit on error
set -o errexit

npm run install-all
npm run build --workspace=client