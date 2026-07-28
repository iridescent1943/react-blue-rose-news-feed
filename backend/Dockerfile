FROM ruby:3.4-alpine AS build
WORKDIR /app
RUN apk add --no-cache build-base mariadb-dev
COPY Gemfile Gemfile.lock ./
RUN bundle install

FROM ruby:3.4-alpine
WORKDIR /app
RUN apk add --no-cache mariadb-connector-c tzdata
COPY --from=build /usr/local/bundle /usr/local/bundle
COPY . .
EXPOSE 3000
CMD bundle exec puma -p ${PORT:-3000} -b tcp://0.0.0.0
