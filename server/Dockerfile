FROM node:18-alpine AS base
WORKDIR /app

# Install production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --production --silent

# Copy source
COPY . .

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "index.js"]
