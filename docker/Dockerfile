# Build stage
FROM node:24-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git vips-dev python3 make g++

# Copy source
COPY . /build

RUN cd /build && yarn add sharp --ignore-engines && yarn install && cd /
# Install global package
RUN npm i -g /build --unsafe-perm

# Install runtime dependencies
RUN apk add --no-cache git vips-dev dumb-init



# Copy entrypoint and config
COPY docker/entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY docker/config /usr/local/bin/config

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /home/nodejs

# Switch to non-root user
USER nodejs

# Set git config
RUN git config --global user.email "dashpub@yourdomain.com" && \
    git config --global user.name "Splunk DashPub"
    
# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=180s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["/usr/local/bin/docker-entrypoint.sh"]
