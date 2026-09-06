FROM node:26-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM node:26-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM caddy:2-alpine AS prod
COPY --from=builder /app/dist /srv
COPY Caddyfile.static /etc/caddy/Caddyfile
EXPOSE 3000