# base stage
FROM node:22-slim AS base

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# runtime stage
FROM node:22-slim AS runtime

RUN groupadd --gid 1001 nodeuser && \
    useradd --uid 1001 --gid nodeuser --shell /bin/sh --create-home nodeuser

WORKDIR /app

COPY --from=base --chown=nodeuser:nodeuser /app/node_modules ./node_modules
COPY --chown=nodeuser:nodeuser package.json ./
COPY --chown=nodeuser:nodeuser src ./src

ENV NODE_ENV=production
ENV PORT=3000

USER nodeuser
EXPOSE 3000

CMD ["node", "src/index.js"]