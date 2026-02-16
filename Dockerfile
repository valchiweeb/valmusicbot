FROM node:18-bullseye-slim

# Install system dependencies
# python3: required for yt-dlp and node-gyp
# build-essential: required for compiling native modules (libsodium, bufferutil, etc.)
# ffmpeg: required for audio processing (backup if ffmpeg-static fails)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy app source
COPY . .

# Start bot
CMD ["node", "index.js"]
