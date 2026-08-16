# Node 22 + SQLite (node:sqlite) + local uploads
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Production env for Vite client build (override at runtime for server secrets)
ARG VITE_APP_URL=https://evagreencorner.com
ENV VITE_APP_URL=$VITE_APP_URL
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Persist SQLite + uploads outside the container filesystem when possible
RUN mkdir -p /app/data /app/public/uploads/reviews /app/public/uploads/content /app/public/uploads/vehicles \
  && chown -R node:node /app

COPY --from=build /app/.output ./.output
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/public ./public

USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
