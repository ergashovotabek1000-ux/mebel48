FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY apps ./apps
COPY db ./db
CMD ["node","apps/api/src/server.js"]
