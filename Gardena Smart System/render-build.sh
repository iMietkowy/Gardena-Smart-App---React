#!/usr/bin/env bash
# exit on error
set -o errexit

# Krok 1: Instalacja zależności dla serwera
echo "==> Installing server dependencies..."
cd server
npm ci

cd .. # Wracamy do głównego folderu

# Krok 2: Instalacja zależności dla klienta
echo "==> Installing client dependencies..."
cd client
npm ci # Używamy npm ci, aby zainstalować WSZYSTKIE zależności, w tym vite

# Krok 3: Budowanie klienta (jesteśmy już w folderze client)
echo "==> Building client..."
npm run build