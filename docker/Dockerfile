# Build stage
FROM node:25-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git vips-dev python3 make g++



# Update npm to latest and manually patch glob to fix vulnerabilities

# Update npm to latest and manually patch glob to fix vulnerabilities

# Update npm to latest and manually patch glob to fix vulnerabilities
RUN npm install -g npm@latest && \
    # Install safe glob in a temp directory
    mkdir -p /tmp/glob-fix && \
    cd /tmp/glob-fix && \
    npm init -y && \
    npm install glob@10.5.0 && \
    # Replace glob in npm
    rm -rf /usr/local/lib/node_modules/npm/node_modules/glob && \
    cp -r node_modules/glob /usr/local/lib/node_modules/npm/node_modules/ && \
    # Replace glob in node-gyp if it exists
    if [ -d "/usr/local/lib/node_modules/npm/node_modules/node-gyp" ]; then \
        rm -rf /usr/local/lib/node_modules/npm/node_modules/node-gyp/node_modules/glob && \
        cp -r node_modules/glob /usr/local/lib/node_modules/npm/node_modules/node-gyp/node_modules/; \
    fi && \
    # Cleanup
    cd / && \
    rm -rf /tmp/glob-fix && \
    npm --version





# Copy source
COPY . /build

# Install dependencies first, then install global package
RUN cd /build && npm install
RUN npm i -g /build --unsafe-perm
RUN ls -la /usr/local/bin/ | grep dashpub || echo "dashpub binary not found in builder stage"
RUN npm list -g --depth=0

# Manually create dashpub binary if npm didn't create it
RUN if [ ! -f /usr/local/bin/dashpub ]; then \
      echo "Creating dashpub binary manually..."; \
      echo '#!/usr/bin/env node' > /usr/local/bin/dashpub; \
      echo 'require("/usr/local/lib/node_modules/@splunk/dashpub/cli/cli.js");' >> /usr/local/bin/dashpub; \
      chmod +x /usr/local/bin/dashpub; \
      echo "Manual dashpub binary created"; \
      ls -la /usr/local/bin/dashpub; \
    else \
      echo "dashpub binary already exists"; \
    fi

# Verify dependencies are available
RUN echo "Checking if inquirer is available in build directory:"
RUN cd /build && node -e "try { import('inquirer'); console.log('inquirer found'); } catch(e) { console.log('inquirer not found:', e.message); }"

# Runtime stage
FROM node:25-alpine

# Install runtime dependencies
RUN apk add --no-cache git vips-dev dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create npm global directory for user
RUN mkdir -p /home/nodejs/.npm-global && \
    chown -R nodejs:nodejs /home/nodejs/.npm-global

# Copy global package from builder stage (both modules and binaries)
COPY --from=builder /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy build directory for CLI access (including node_modules)
COPY --from=builder /build /build

# Verify the dashpub binary is available
RUN ls -la /usr/local/bin/ | grep dashpub || echo "dashpub binary not found in runtime stage"
RUN echo "Available binaries:" && ls -la /usr/local/bin/

# Copy entrypoint and config
COPY docker/entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY docker/config /usr/local/bin/config

# Set working directory
WORKDIR /home/nodejs

# Set git config
RUN git config --global user.email "dashpub@yourdomain.com" && \
    git config --global user.name "Splunk DashPub"

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=300s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["/usr/local/bin/docker-entrypoint.sh"]
