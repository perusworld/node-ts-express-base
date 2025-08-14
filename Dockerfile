# ---- Base image ----
FROM node:22-alpine AS base
WORKDIR /app

# ---- Dependencies (for builds and dev) ----
FROM base AS deps
COPY package*.json ./
RUN npm ci

# ---- Build (prod) ----
FROM deps AS build
COPY . .
RUN npm run build

# ---- Production runtime ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/views ./views
COPY --from=build /app/config ./config
COPY --from=build /app/bin ./bin
COPY --from=build /app/env.docker ./env.docker
EXPOSE 3000
CMD ["npm", "start"]

# ---- Dev runtime (hot reload) ----
FROM deps AS dev
WORKDIR /app
ENV NODE_ENV=development \
    PORT=3000
# Bring in the rest of the source for initial image build; compose will mount a volume over it
COPY . .
# Keep full dev deps for tooling (ts-node-dev / nodemon / eslint etc.)
# No build step — run TS directly with your dev script
EXPOSE 3000
CMD ["npm", "run", "dev"]
