FROM node:20.19.4-alpine AS builder
ARG SERVICE_VERSION=dev
ENV SERVICE_VERSION=${SERVICE_VERSION}
LABEL org.opencontainers.image.revision=${SERVICE_VERSION}
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20.19.4-alpine
WORKDIR /app
RUN npm install -g serve && apk add --no-cache curl
COPY --from=builder /app/dist ./dist
RUN addgroup -g 1001 app && adduser -D -u 1001 -G app app
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s CMD curl -f http://localhost:3000/ || exit 1
CMD ["serve", "-s", "dist", "-l", "3000"]
