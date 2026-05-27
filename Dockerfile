FROM node:22-alpine AS install
RUN apk add --no-cache postgresql-client
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM node:22-alpine AS build
RUN apk add --no-cache postgresql-client python3 make g++
WORKDIR /app
COPY --from=install /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=libs/prisma/schema.prisma
RUN npm run build:admin && npm run build:company && npm run build:customer

FROM node:22-alpine
RUN apk add --no-cache postgresql-client nginx gettext
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/libs/prisma/schema.prisma ./libs/prisma/schema.prisma
COPY --from=build /app/package.json ./
RUN npx prisma generate --schema=libs/prisma/schema.prisma
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 8080
CMD ["/docker-entrypoint.sh"]
