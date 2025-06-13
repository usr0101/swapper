#!/bin/bash

echo "Setting up PATH for Solana and Anchor..."

echo 'export PATH="/root/.cargo/bin:$PATH"' >> ~/.bashrc
echo 'export PATH="/root/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc

# Rebuild Rust packages just in case
source ~/.bashrc
rustup update
