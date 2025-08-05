#!/usr/bin/env bash
# exit on error
set -o errexit

# Krok 1: Instalacja zależności dla serwera
echo "==> Installing server dependencies..."
cd server
npm install
cd .. # Wracamy do głównego folderu

# Krok 2: Instalacja zależności dla klienta
echo "==> Installing client dependencies..."
cd client
npm install

# Krok 3: Budowanie klienta (jesteśmy już w folderze client)
echo "==> Building client..."
npm run build