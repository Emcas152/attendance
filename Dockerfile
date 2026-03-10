FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build:backend

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
ENV SERVE_STATIC=false
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist-backend ./dist-backend
EXPOSE 5000
CMD ["node", "dist-backend/index.cjs"]