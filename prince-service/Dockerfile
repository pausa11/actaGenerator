FROM node:20-slim

# Versión de PrinceXML — actualiza si hay una más nueva en https://www.princexml.com/download/
ARG PRINCE_VERSION=16.2

RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    libfontconfig1 \
    libfreetype6 \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

RUN wget -q "https://www.princexml.com/download/prince-${PRINCE_VERSION}-linux-generic-x86_64.tar.gz" -O prince.tar.gz && \
    tar -xzf prince.tar.gz && \
    cd "prince-${PRINCE_VERSION}-linux-generic-x86_64" && \
    echo "/usr/local" | ./install.sh && \
    cd .. && rm -rf "prince-${PRINCE_VERSION}-linux-generic-x86_64" prince.tar.gz

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js ./

EXPOSE 3001
CMD ["node", "server.js"]
