#!/usr/bin/env bash
# exit on error
set -o errexit

# Instaluje zależności dla obu projektów (client i server)
# na podstawie konfiguracji "workspaces" w głównym package.json
echo "==> Installing all dependencies..."
npm install --workspaces

# Fizycznie wchodzi do katalogu klienta i dopiero stamtąd
# uruchamia budowanie. To gwarantuje znalezienie komendy 'vite'.
echo "==> Building client..."
cd client
npm run build