FROM node:18-alpine

WORKDIR /app

# Install cloudflared for tunnel
RUN npm install -g cloudflared

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

# Run x402 server with cloudflared tunnel
CMD ["sh", "-c", "node server.js & cloudflared tunnel --url http://localhost:3000"]
