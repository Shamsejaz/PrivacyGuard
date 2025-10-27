# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git python3 make g++

# Copy package files first for better caching
COPY package*.json ./

# Clear npm cache and install dependencies
RUN npm cache clean --force && \
    npm install --no-audit --no-fund

# Copy source code
COPY . .

# Build arguments for environment variables
ARG NODE_ENV=production
ARG VITE_API_BASE_URL=https://app.privacycomply.ai/api/v1
ARG VITE_API_URL=https://app.privacycomply.ai/api/v1
ARG VITE_WS_URL=wss://app.privacycomply.ai
ARG VITE_APP_NAME=PrivacyComply
ARG VITE_NODE_ENV=production

# Set environment variables
ENV NODE_ENV=$NODE_ENV
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_NODE_ENV=$VITE_NODE_ENV

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built files to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configurations
COPY nginx/ /tmp/nginx-configs/

# Set up nginx configuration with fallback
RUN if [ -f /tmp/nginx-configs/backend-auth.conf ]; then \
        cp /tmp/nginx-configs/backend-auth.conf /etc/nginx/conf.d/default.conf; \
    elif [ -f /tmp/nginx-configs/default.conf ]; then \
        cp /tmp/nginx-configs/default.conf /etc/nginx/conf.d/default.conf; \
    else \
        echo 'server { listen 80; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } location /health { return 200 "healthy"; add_header Content-Type text/plain; } }' > /etc/nginx/conf.d/default.conf; \
    fi && \
    rm -rf /tmp/nginx-configs

# Create nginx directories
RUN mkdir -p /var/cache/nginx/client_temp && \
    mkdir -p /var/cache/nginx/proxy_temp && \
    mkdir -p /var/cache/nginx/fastcgi_temp && \
    mkdir -p /var/cache/nginx/uwsgi_temp && \
    mkdir -p /var/cache/nginx/scgi_temp

# Set proper permissions
RUN chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]