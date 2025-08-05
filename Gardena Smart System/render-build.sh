#!/usr/bin/env bash
# exit on error
set -o errexit

# Instaluje zależności w głównym folderze (dla concurrently)
npm install

# Używamy flagi --prefix, aby jawnie zainstalować zależności w każdym folderze
echo "==> Installing server dependencies..."
npm install --prefix server

echo "==> Installing client dependencies..."
npm install --prefix client

# Używamy flagi --prefix, aby jawnie uruchomić budowanie frontendu
echo "==> Building client..."
npm run build --prefix client