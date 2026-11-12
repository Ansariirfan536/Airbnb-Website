FROM node:20-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

COPY --chown=node:node . .

USER node

EXPOSE 8080

CMD ["npm", "start"]
