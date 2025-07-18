# Stage 1: Go Builder (Backend)
FROM golang:1.24.2-alpine AS go-builder

# Install git, as it might be needed by go mod download or go build
RUN apk add --no-cache git

WORKDIR /app

# Copy go.mod and go.sum for the entire server project
COPY server/go.mod server/go.sum ./
RUN go mod download

# Copy the entire server source code
COPY server/ ./server/

# Build backend (assuming main package is at the root of 'server/' content)
# Using -ldflags to create smaller binaries
RUN cd server && go build -ldflags="-w -s" -o /app/olake-server .

# Stage 2: Frontend Builder
FROM node:20-alpine AS node-builder
WORKDIR /app/ui

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY ui/package.json ui/pnpm-lock.yaml ./
# Install dependencies
RUN pnpm install

# Copy the rest of the UI code
COPY ui/ ./
# Build the UI
RUN pnpm build

# Stage 3: Final Runtime Image
FROM alpine:latest

# Install dependencies: supervisor, nodejs, and npm (for 'serve')
# docker-cli is removed as worker is no longer included
RUN apk add --no-cache supervisor nodejs npm

# Install 'serve' globally for the frontend
RUN npm install -g serve

# Create directories for applications, logs, and supervisor config
RUN mkdir -p /opt/backend/conf \
             /opt/frontend/dist \
             /var/log/supervisor \
             /etc/supervisor/conf.d

# Copy built artifacts from builder stages
COPY --from=go-builder /app/olake-server /opt/backend/olake-server
# Copy the backend configuration file
COPY server/conf/app.conf /opt/backend/conf/app.conf
COPY --from=node-builder /app/ui/dist /opt/frontend/dist

# Copy supervisor configuration file
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose necessary ports
EXPOSE 8080
EXPOSE 8000

# Set the default command to run Supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
