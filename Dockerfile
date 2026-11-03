# Multi-stage Dockerfile for Ploty API

# Stage 1: Base & Dependencies
FROM node:22-alpine AS dependencies
WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

# Stage 2: Development (used for local containerized dev)
FROM node:22-alpine AS development
WORKDIR /usr/src/app

COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# Stage 3: Builder for production
FROM node:22-alpine AS build
WORKDIR /usr/src/app

COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY . .

RUN npm run build
RUN npm prune --omit=dev

# Stage 4: Production runner
FROM node:22-alpine AS production
WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma
COPY package*.json ./

USER node

EXPOSE 3000
CMD ["node", "dist/main.js"]
