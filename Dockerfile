# Frontend builder stage
FROM node:18-alpine AS frontend-builder
WORKDIR /app
ENV NEXT_PUBLIC_API_URL https://my-aienglish-backend-528300933169.asia-southeast2.run.app
# Copy package files
COPY package*.json ./
# Install dependencies including optional dependencies for lightningcss
RUN npm install

# Install specific lightningcss binary for Alpine Linux ARM64
# RUN npm install lightningcss-linux-arm64-musl

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]