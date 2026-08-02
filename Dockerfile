# Production Dockerfile for Credify Backend Node/Express API
FROM node:20-alpine

# Set environment to production
ENV NODE_ENV=production
WORKDIR /app

# Install dependencies with lockfile enforcement
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application source code
COPY . .

# Change file ownership to non-root node user
RUN chown -R node:node /app
USER node

# Expose backend service port
EXPOSE 5000

# Start production server directly with node
CMD ["node", "server.js"]
