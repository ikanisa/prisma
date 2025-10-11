FROM node:20-alpine
ARG SERVICE_VERSION=dev
ENV SERVICE_VERSION=${SERVICE_VERSION}
LABEL org.opencontainers.image.revision=${SERVICE_VERSION}
WORKDIR /app
COPY . .
RUN if [ -f package.json ]; then npm ci --omit=dev; fi
RUN apk add --no-cache curl
RUN addgroup -g 1001 app && adduser -D -u 1001 -G app app
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "index.js"]
