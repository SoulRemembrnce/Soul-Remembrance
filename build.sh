#!/bin/bash
export PNPM_HOME="$HOME/.local/share/pnpm"
mkdir -p "$PNPM_HOME"
export PATH="$PNPM_HOME:$PATH"
pnpm add -g eas-cli
cd artifacts/mobile && eas build --profile preview --platform android
