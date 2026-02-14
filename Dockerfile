FROM node:18-alpine

WORKDIR /app

# Copy all files
COPY . .

# Install server dependencies
WORKDIR /app/server
RUN npm install --omit=dev

# Install client dependencies and build
WORKDIR /app/client
RUN npm install && npm run build

# Back to root
WORKDIR /app

# Expose port
EXPOSE 5000

# Start the server
CMD ["node", "server/index.js"]
