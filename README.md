# MVP (Comandi Avvio - dopo scaricamento dalla repo)

## Costruisce le immagini Docker per Frontend e Backend
docker compose build

## Crea e prepara il database per il Backend (comprende db:create, db:schema:load, db:seed)
docker compose run --rm backend rails db:setup

## Avvia l'intera applicazione
docker compose up

//---------------------------------------------------------------------------------------------------------------------

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

## Creazione tabelle indipendenti

docker compose run --rm backend rails generate model Company name:string

docker compose run --rm backend rails generate model User cf:string username:string password:string email:string name:string surname:string

### Template (con la relazione a se stesso chiamata version_id)
docker compose run --rm backend rails generate model Template subject:text body_text:text

## tabelle 1 dipendenza

docker compose run --rm backend rails generate model Tone name:string description:text company:references

docker compose run --rm backend rails generate model Style name:string description:text company:references

### Employee (IdUser e IdCompany diventano user_id e company_id in standard Rails)
docker compose run --rm backend rails generate model Employee department:string user:references company:references

## tabelle 2 dipendenza

docker compose run --rm backend rails generate model GeneratedDatum title:string text_result:text img_path:string generation_time:decimal data_time:datetime rating:decimal prompt:text height:integer width:integer seed:string status:string tone:references style:references company:references version_id:bigint:index

docker compose run --rm backend rails generate model UploadedDocument checksum:string file_kind:string storage_path:string original_filename:string override_company:string override_department:string page_count:integer category:string competence_period:string employee:references

## tabelle 3 dipendenza

docker compose run --rm backend rails generate model Post title:string body_text:text date_time:datetime img_path:string generated_datum:references

docker compose run --rm backend rails generate model ProcessingRun status:string completed_at:datetime error_message:text job_id:string original_file_name:string processed_documents:integer total_documents:integer uploaded_document:references

### Nota: matched_employee_id mantenuto esatto
docker compose run --rm backend rails generate model ExtractedDocument confidence:string page_start:integer page_end:integer error_message:text sequence:integer metadata:jsonb status:string process_time_seconds:decimal processed_at:datetime uploaded_document:references matched_employee:references

## tabelle 4 dipendenza

docker compose run --rm backend rails generate model ProcessingItem error_message:text status:string sequence:integer filename:string extracted_document:references processing_run:references

### Nota: recipient_id e template_document_id mantenuti esatti
docker compose run --rm backend rails generate model Sending body:text sent_at:datetime subject:string recipient:references extracted_document:references template_document:references

## Creare tabelle nel db

docker compose run --rm backend rails db:migrate

## Popolare db

docker compose run --rm backend rails db:seed

## Avvio applicazione

docker compose up


# Comandi utili

## Controllo versioni

docker compose run --rm backend ruby -v
docker compose run --rm backend rails -v
docker compose run --rm frontend node -v
docker compose run --rm frontend ng version


## Lanciare test (tutti)

docker compose run --rm backend rails test

## Lanciare test (modulo analyst)

docker compose run --rm backend rails test test/managers/*_test.rb test/controllers/*_test.rb


