# Build and run with Bun
FROM oven/bun:1
WORKDIR /app

# Install dependencies (cache layer)
COPY bun.lock package.json ./
RUN bun install --ci

# Copy the rest of the source
COPY . .

# Build the server binary
RUN bun run build

# Expose the app port
EXPOSE 3000

# Run the compiled server
CMD ["./server"]

