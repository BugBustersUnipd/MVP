FROM ruby:3.3

RUN apt-get update -qq && apt-get install -y build-essential libpq-dev

WORKDIR /app

# Installiamo le gemme
COPY Gemfile Gemfile.lock ./
RUN bundle install

COPY . .

EXPOSE 3000

# Rimuove eventuali pid vecchi e avvia il server associandolo a tutti gli IP
CMD ["bash", "-c", "rm -f tmp/pids/server.pid && bin/rails server -b '0.0.0.0'"]