FROM node:21-bookworm

WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app

# azure cli
RUN curl -LsS https://aka.ms/InstallAzureCLIDeb | bash \
    && rm -rf /var/lib/apt/lists/*

ENTRYPOINT ["node", "index.js"]
