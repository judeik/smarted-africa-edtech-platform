FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev

FROM base AS dev-deps
COPY package*.json ./
RUN npm ci

FROM base AS build
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .

FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/package.json ./package.json

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs
USER nodejs

EXPOSE 5000
CMD ["node", "server.js"]
