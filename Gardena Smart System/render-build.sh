#!/usr/bin/env bash
# exit on error
set -o errexit

# Krok 1: Instalacja zależności produkcyjnych dla serwera
echo "==> Installing server dependencies..."
cd server
npm install
cd .. # Wracamy do głównego folderu

# Krok 2: Instalacja WSZYSTKICH zależności (w tym dev) dla klienta
echo "==> Installing client dependencies..."
cd client
npm install --production=false # Ta flaga zmusza npm do instalacji devDependencies

# Krok 3: Budowanie klienta (jesteśmy już w folderze client)
echo "==> Building client..."
npm run build