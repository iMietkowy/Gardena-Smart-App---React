#!/usr/bin/env bash
# exit on error
set -o errexit

# Instaluje zależności dla obu projektów (client i server)
npm install --workspaces

# Wchodzi do katalogu klienta i uruchamia budowanie
echo "Building client..."
cd client
npm run buildgit