FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl tini
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /app/public ./public
# Ensure the uploads dir exists and is writable by the app user. The named
# `uploads` volume (see docker-compose.yml) inherits this ownership on first
# mount, so runtime cover uploads to /app/public/uploads succeed.
RUN mkdir -p /app/public/uploads && chown -R app:app /app/public/uploads
COPY --from=builder --chown=app:app /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/jobs ./jobs
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/tsconfig.json ./tsconfig.json
USER app
EXPOSE 3000
ENTRYPOINT ["/sbin/tini","--"]
CMD ["npm","start"]
