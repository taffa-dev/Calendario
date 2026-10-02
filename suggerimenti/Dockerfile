# Immagine del server delle proposte (linux/arm64 per il Raspberry Pi; la costruisce la GitHub
# Action .github/workflows/suggerimenti.yml). Nessun modulo nativo: SQLite è quello integrato in Node.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY server.mjs db.mjs esterni.mjs liste.mjs pagine.mjs notifiche.mjs ./
COPY public ./public
# Utente node (uid 1000, lo stesso di "taffa" sul Pi): la cartella data/ creata da lui va già bene
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=60s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/salute || exit 1
CMD ["node", "server.mjs"]
