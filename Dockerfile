FROM node:22-slim

WORKDIR /app

# Install dependencies for both root and frontend
COPY package.json ./
COPY frontend/package.json frontend/package-lock.json ./frontend/

RUN npm install && npm --prefix frontend install

# Copy source
COPY . .

# Build frontend
RUN npm run build

# Expose port
EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

# Start backend (serves API + static frontend)
CMD ["node", "backend/server.mjs"]