FROM node:18-slim

WORKDIR /app

# Prisma needs OpenSSL on slim images
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

RUN npx prisma generate

COPY . .

RUN npm run build

EXPOSE 4000

CMD ["node", "dist/index.js"]
