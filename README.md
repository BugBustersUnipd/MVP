# MVP (Comandi Avvio - dopo scaricamento dalla repo)

## Costruisce le immagini Docker per Frontend e Backend
docker compose build

## Crea e prepara il database per il Backend (comprende db:create, db:schema:load, db:seed)
docker compose run --rm backend rails db:setup

## Avvia l'intera applicazione
docker compose up


# MVP (Creazione da 0)

## Creazione Backend

docker run --rm -v ${PWD}:/app -w /app ruby:3.3 bash -c "gem install rails && rails new backend --api -d postgresql --skip-git"

## Creazione Frontend

docker run --rm -v ${PWD}:/app -w /app node:24 bash -c "npm install -g @angular/cli@21 && ng new frontend --directory frontend --skip-git"

## Creare Dockerfile e docker-compose.yml

## Decommentare la gem "rack-cors" e eseguire questo comando (Per comunicazione tra angular e Ruby on Rails)

docker compose run --rm backend bundle install

## Scaricare Node e Ruby / Compilare le due applicazioni

docker compose build

## Creazione DB

docker compose run --rm backend rails db:create

## Avvio applicazione

docker compose up


# Comandi utili

## Controllo versioni

docker compose run --rm backend ruby -v
docker compose run --rm backend rails -v
docker compose run --rm frontend node -v
docker compose run --rm frontend ng version


