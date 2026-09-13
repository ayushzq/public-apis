FROM node:20-bookworm-slim

# Baileys/Prisma need these native libs (openssl for Prisma, git for a
# couple of transitive deps that install from git tarballs).
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# Where Baileys persists each linked WhatsApp session — mount a volume
# here in production so you don't have to re-scan the QR on redeploy.
RUN mkdir -p /app/wa-sessions
VOLUME ["/app/wa-sessions"]

ENV NODE_ENV=production
ENV PORT=4000
ENV WA_SESSIONS_DIR=/app/wa-sessions

EXPOSE 4000

# सर्वर स्टार्ट करने से पहले डेटाबेस में नई टेबल्स बनाना ज़रूरी है
CMD npx prisma db push --accept-data-loss && node server.js
