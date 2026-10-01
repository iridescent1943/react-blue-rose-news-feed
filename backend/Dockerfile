FROM ruby:4.0.6-alpine AS build
WORKDIR /app
ENV BUNDLE_WITHOUT=test
RUN apk add --no-cache build-base postgresql-dev
COPY Gemfile Gemfile.lock ./
RUN bundle install

FROM ruby:4.0.6-alpine AS runtime
WORKDIR /app
ENV BUNDLE_WITHOUT=test
RUN apk add --no-cache libpq tzdata
COPY --from=build /usr/local/bundle /usr/local/bundle
COPY . .
EXPOSE 3000
CMD bundle exec puma
