# Start with the standard Linux base
FROM mcr.microsoft.com/devcontainers/base:bookworm

# Install Deno by copying the binary directly from the official image
# This is faster and doesn't require "ghcr.io" authentication
COPY --from=denoland/deno:bin /deno /usr/local/bin/deno

# Fix permissions so the 'vscode' user can write to the Deno cache
RUN chmod 755 /usr/local/bin/deno