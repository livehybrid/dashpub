# Build and runtime use Alpine (musl) — project preference.
# `sharp` may compile from source under musl/arm64; builder installs vips-dev + a native toolchain.
# Base images are pulled via AWS Public ECR mirror of Docker Hub `library/*` to reduce Hub rate limits in CI.
FROM public.ecr.aws/docker/library/node:24-alpine AS builder

RUN apk update && apk upgrade -a && apk add --no-cache \
    ca-certificates \
    curl \
    git \
    python3 \
    make \
    g++ \
    pkgconf \
    vips-dev \
  && rm -rf /var/cache/apk/*

RUN npm install -g npm@11.12.1

# Manually patch glob in system npm to fix vulnerabilities
RUN mkdir -p /tmp/glob-fix && \
    cd /tmp/glob-fix && \
    npm init -y && \
    npm install glob@^10.5.0 && \
    rm -rf /usr/local/lib/node_modules/npm/node_modules/glob && \
    cp -r node_modules/glob /usr/local/lib/node_modules/npm/node_modules/ && \
    if [ -d "/usr/local/lib/node_modules/npm/node_modules/node-gyp/node_modules/glob" ]; then \
      rm -rf /usr/local/lib/node_modules/npm/node_modules/node-gyp/node_modules/glob && \
      cp -r node_modules/glob /usr/local/lib/node_modules/npm/node_modules/node-gyp/node_modules/; \
    fi && \
    rm -rf /tmp/glob-fix

COPY . /build

RUN npm install -g node-gyp@^11.5.0
RUN cd /build && npm install --include=dev --no-audit --no-fund
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

FROM public.ecr.aws/docker/library/node:24-alpine

RUN apk update && apk upgrade -a && apk add --no-cache \
    ca-certificates \
    curl \
    dumb-init \
    git \
    python3 \
    make \
    g++ \
    pkgconf \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ttf-freefont \
    vips \
  && rm -rf /var/cache/apk/*

RUN npm install -g npm@11.12.1

RUN npm install -g node-gyp@^11.5.0

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

RUN mkdir -p /home/nodejs/.npm-global && \
    chown -R nodejs:nodejs /home/nodejs/.npm-global

COPY --from=builder /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /build /build

# The builder stage may ship its own copy of npm's bundled dependencies under `/usr/local/lib/node_modules`.
# Re-apply the bundled `picomatch` bump after copying so Trivy doesn't flag the older transitive version
# that ships with npm's `tinyglobby` dependency chain.
RUN mkdir -p /tmp/picomatch-fix && \
    cd /tmp/picomatch-fix && \
    npm init -y >/dev/null 2>&1 && \
    npm install picomatch@^4.0.4 >/dev/null 2>&1 && \
    target="/usr/local/lib/node_modules/npm/node_modules/tinyglobby/node_modules/picomatch" && \
    if [ -d "$target" ]; then \
      rm -rf "$target" && \
      cp -r node_modules/picomatch "$target"; \
    fi && \
    rm -rf /tmp/picomatch-fix

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
  CMD node -e "require('http').get('http://127.0.0.1:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

ENTRYPOINT ["dumb-init", "--"]

CMD ["/usr/local/bin/docker-entrypoint.sh"]
