# Container image for Hugging Face Spaces (Docker SDK). Spaces expect the app on port 7860.
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev
ENV NODE_ENV=production PORT=7860 DATA_FILE=/tmp/rooms.json
EXPOSE 7860
USER node
CMD ["node", "server/index.js"]
