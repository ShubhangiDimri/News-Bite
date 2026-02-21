# Use a lightweight version of Node
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy only package files first to leverage Docker's cache
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy the rest of the application code
COPY . .

# Match the port in your app
EXPOSE 3000

# Start the application
CMD ["node", "app.js"]