# Use Node.js 18 as the base image
FROM node:18-slim

# Set working directory
WORKDIR /usr/src/app

# Install PM2 globally
RUN npm install -g pm2

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p /usr/src/app/data && \
    chown -R node:node /usr/src/app

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Start the application with PM2
CMD ["pm2-runtime", "server.js"] 