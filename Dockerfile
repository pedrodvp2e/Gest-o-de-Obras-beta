# Multi-stage build for optimal image size

# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:web

# Stage 2: Build the backend and prepare final image
FROM node:18-alpine
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist

# Copy backend source
COPY server.ts server-db.ts tsconfig.json ./
COPY src/types.ts ./src/

# Compile TypeScript backend
RUN npx tsc server.ts --outDir dist --target ES2020 --module commonjs --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/sites', (r) => {if (r.statusCode !== 401) throw new Error(r.statusCode)})"

# Start the application
CMD ["node", "dist/server.js"]
