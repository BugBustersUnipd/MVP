FROM node:24

WORKDIR /app

# Installiamo la CLI globalmente nel container
RUN npm install -g @angular/cli@21

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4200

# Usiamo il polling per far funzionare l'hot-reload (aggiornamento in tempo reale) su WSL
CMD ["ng", "serve", "--host", "0.0.0.0", "--poll", "2000"]