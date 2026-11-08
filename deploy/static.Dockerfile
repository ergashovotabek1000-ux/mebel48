FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY apps ./apps
ARG TARGET
ARG VITE_API_URL=https://api.mebel48.uz
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build:$TARGET
FROM nginx:1.27-alpine
ARG TARGET
COPY --from=build /app/dist/$TARGET /usr/share/nginx/html
COPY deploy/static.conf /etc/nginx/conf.d/default.conf
