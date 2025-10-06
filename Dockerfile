FROM node:18-alpine

# Informations du maintainer
LABEL maintainer="Kbine Team"
LABEL description="Backend API pour l'application Kbine"

# Creation du repertoire de travail
WORKDIR /app

# Copie des fichiers de dependances
COPY package*.json pnpm-lock.yaml ./

# Installation de pnpm et des dependances
RUN npm install -g pnpm && \
    pnpm install --prod && \
    pnpm store prune

# Creation du repertoire logs
RUN mkdir -p logs

# Copie du code source
COPY src/ ./src/
COPY scripts/ ./scripts/

# Creation d'un utilisateur non-root pour la securite
RUN addgroup -g 1001 -S nodejs && \
    adduser -S kbine -u 1001

# Attribution des permissions
RUN chown -R kbine:nodejs /app
USER kbine

# Exposition du port
EXPOSE 3000

# Variables d'environnement par defaut
ENV NODE_ENV=production
ENV PORT=3000

# Commande de demarrage
CMD ["npm", "start"]