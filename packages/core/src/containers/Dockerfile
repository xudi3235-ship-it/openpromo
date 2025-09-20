# syntax=docker/dockerfile:1.6

FROM golang:1.24.4-alpine AS base
WORKDIR /src
COPY go.mod ./
RUN go mod download

FROM base AS build
COPY . .
RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags='-s -w' -o /out/server .

FROM alpine:3.20
WORKDIR /app
RUN apk add --no-cache ffmpeg
COPY --from=build /out/server ./server

EXPOSE 8080
ENV PORT=8080
ENTRYPOINT ["/app/server"]
