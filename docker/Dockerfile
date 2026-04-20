# Build and runtime use Alpine (musl) per project preference. sharp may compile from source under
# musl or arm64; the builder installs vips-dev + a full native toolchain and npm devDependencies
# (node-gyp). The runtime image keeps the same toolchain because the entrypoint runs `npm install`
# and `npm run build` inside the generated Next.js app.
FROM node:24-alpine AS builder

RUN apk update && apk upgrade -a && apk add --no-cache \
    ca-certificates \
    git \
    python3 \
    make \
    g++ \
    pkgconf \
    vips-dev

COPY . /build

RUN npm install -g node-gyp@^11.5.0 \
  && cd /build \
  && npm install --include=dev --no-audit --no-fund

RUN npm i -g /build
RUN ls -la /usr/local/bin/ | grep dashpub || echo "dashpub binary not found in builder stage"
RUN npm list -g --depth=0

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

RUN echo "Checking if inquirer is available in build directory:"
RUN cd /build && node -e "try { import('inquirer'); console.log('inquirer found'); } catch(e) { console.log('inquirer not found:', e.message); }"

FROM node:24-alpine

RUN apk update && apk upgrade -a && apk add --no-cache \
    ca-certificates \
    dumb-init \
    git \
    python3 \
    make \
    g++ \
    pkgconf \
    chromium \
    vips-dev

RUN npm install -g node-gyp@^11.5.0

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN addgroup -g 1001 -S nodejs \
  && adduser -S -u 1001 -G nodejs nodejs

RUN mkdir -p /home/nodejs/.npm-global && \
    chown -R nodejs:nodejs /home/nodejs/.npm-global

COPY --from=builder /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /build /build

RUN ls -la /usr/local/bin/ | grep dashpub || echo "dashpub binary not found in runtime stage"
RUN echo "Available binaries:" && ls -la /usr/local/bin/

COPY docker/entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY docker/config /usr/local/bin/config

WORKDIR /home/nodejs

RUN git config --global user.email "dashpub@yourdomain.com" && \
    git config --global user.name "Splunk DashPub"

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=300s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

ENTRYPOINT ["dumb-init", "--"]

CMD ["/usr/local/bin/docker-entrypoint.sh"]
