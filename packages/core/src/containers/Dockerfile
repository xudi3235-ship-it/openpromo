# NOTE: syntax directive removed to avoid Docker credential issues in dev containers
FROM golang:1.25.4-alpine AS base
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
RUN apk add --no-cache ffmpeg ca-certificates fuse curl bash fontconfig

# Install Montserrat font family for viral subtitles
RUN mkdir -p /usr/share/fonts/montserrat && \
    curl -L "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-ExtraBold.ttf" -o /usr/share/fonts/montserrat/Montserrat-ExtraBold.ttf && \
    curl -L "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Bold.ttf" -o /usr/share/fonts/montserrat/Montserrat-Bold.ttf && \
    curl -L "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Black.ttf" -o /usr/share/fonts/montserrat/Montserrat-Black.ttf && \
    fc-cache -fv
# Install tigrisfs for mounting R2 via FUSE
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then ARCH="amd64"; fi && \
    if [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; fi && \
    VERSION=$(curl -s https://api.github.com/repos/tigrisdata/tigrisfs/releases/latest | grep -o '"tag_name": "[^"]*' | cut -d'"' -f4) && \
    curl -L "https://github.com/tigrisdata/tigrisfs/releases/download/${VERSION}/tigrisfs_${VERSION#v}_linux_${ARCH}.tar.gz" -o /tmp/tigrisfs.tar.gz && \
    tar -xzf /tmp/tigrisfs.tar.gz -C /usr/local/bin/ && \
    rm /tmp/tigrisfs.tar.gz && \
    chmod +x /usr/local/bin/tigrisfs
COPY --from=build /out/server ./server
COPY entrypoint.sh /app/entrypoint.sh

EXPOSE 8080
ENV PORT=8080
ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
