FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl gnupg build-essential pkg-config libssl-dev libudev-dev git \
    && apt-get clean

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install Solana CLI (v1.18.14)
RUN curl -sSfL https://release.solana.com/v1.18.14/solana-install-init.sh | bash -s - -y
ENV PATH="/root/.local/share/solana/install/active_release/bin:${PATH}"

# Install Anchor CLI (v0.28.0)
RUN cargo install --git https://github.com/coral-xyz/anchor --tag v0.28.0 anchor-cli

# Make sure PATH is available for vscode user too
ENV CARGO_HOME="/root/.cargo"
ENV SOLANA_HOME="/root/.local/share/solana/install/active_release"
