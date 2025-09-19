FROM golang:1.24-alpine
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
ENV CGO_ENABLED=0 GOOS=linux GOARCH=amd64
RUN go build -o /usr/local/bin/server
EXPOSE 8080
CMD ["server"]
