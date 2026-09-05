FROM node:22-bookworm-slim AS install
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
# skia-canvas ships a platform prebuild; download it explicitly because
# --ignore-scripts skips its install hook (root postinstall needs the schema,
# which is only copied later).
RUN node node_modules/skia-canvas/lib/prebuild.mjs download

FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=install /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=libs/prisma/schema.prisma
RUN npm run build:admin && npm run build:company && npm run build:customer

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client nginx-light gettext-base ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/fonts ./fonts
COPY --from=build /app/assets ./assets
COPY --from=build /app/libs/prisma/schema.prisma ./libs/prisma/schema.prisma
COPY --from=build /app/package.json ./
RUN npx prisma generate --schema=libs/prisma/schema.prisma
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 8080
CMD ["/docker-entrypoint.sh"]
