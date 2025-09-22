FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./

RUN npm install -g pnpm

RUN pnpm install

COPY prisma ./prisma/

RUN pnpm prisma generate

COPY . .

RUN pnpm run build

FROM node:20-slim

ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

# Only copy what we need to run
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Permissions
RUN mkdir -p /app/dist /app/node_modules && \
    chown -R node:node /app && \
    chmod -R 755 /app

# Entrypoint
COPY --chown=node:node ./entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh && sed -i 's/\r$//' /app/entrypoint.sh

USER node

# Railway typically maps PORT; Nest reads BACKEND_PORT in this app. Expose 3001 by default.
EXPOSE 3001

ENTRYPOINT ["/app/entrypoint.sh"]