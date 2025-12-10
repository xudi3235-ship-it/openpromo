#!/bin/bash
set -euo pipefail

echo "[INFO] OpenPromo Development Setup"

# Install Docker CLI using official Debian installation
if ! command -v docker &> /dev/null; then
  echo "[INFO] Installing Docker CLI for Debian..."

  # Update package index
  apt-get update

  # Install packages to allow apt to use a repository over HTTPS
  apt-get install -y \
    ca-certificates \
    curl \
    gnupg

  # Add Docker's official GPG key
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  # Set up the repository
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  # Install Docker Engine
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  echo "[INFO] Docker installation completed"
else
  echo "[INFO] Docker CLI already installed"
fi

# Verify Docker installation
if command -v docker &> /dev/null; then
  echo "[INFO] Docker version: $(docker --version)"

  # Ensure Docker is in standard PATH locations
  DOCKER_PATH=$(which docker)
  echo "[INFO] Docker installed at: ${DOCKER_PATH}"

  # Create symlinks to ensure Docker is found by Cloudflare plugin
  if [[ "$DOCKER_PATH" != "/usr/bin/docker" && ! -f "/usr/bin/docker" ]]; then
    echo "[INFO] Creating symlink for Docker at /usr/bin/docker"
    ln -sf "$DOCKER_PATH" /usr/bin/docker
  fi

  # Test if Docker daemon is accessible
  if [ -S "/var/run/docker.sock" ]; then
    echo "[INFO] Docker socket is available from host"
    if docker info &> /dev/null; then
      echo "[INFO] Docker daemon is accessible"
    else
      echo "[WARN] Docker socket available but daemon not responding"
    fi
  else
    echo "[INFO] Docker socket not mounted - using Docker CLI from container"
  fi
else
  echo "[ERROR] Docker installation failed"
  exit 1
fi

# Update PATH to include Docker location
export PATH="/usr/bin:/bin:/usr/local/bin:$PATH"
echo 'export PATH="/usr/bin:/bin:/usr/local/bin:$PATH"' >> ~/.bashrc

# Install Node.js v25.2.1 directly
if ! command -v node &> /dev/null || [[ "$(node --version)" != "v25.2.1" ]]; then
  echo "[INFO] Installing Node.js v25.2.1..."
  NODE_VERSION="25.2.1"

  # Detect architecture and OS
  ARCH=$(uname -m)
  OS=$(uname -s)
  echo "[DEBUG] Detected OS: $OS, Architecture: $ARCH"

  # Normalize architecture names for different platforms
  case "$ARCH" in
    x86_64|amd64)
      NODE_ARCH="x64"
      GO_ARCH="amd64"
      ;;
    aarch64|arm64)
      NODE_ARCH="arm64"
      GO_ARCH="arm64"
      ;;
    *)
      echo "[ERROR] Unsupported architecture: $ARCH"
      echo "[INFO] Supported architectures: x86_64, amd64, aarch64, arm64"
      exit 1
      ;;
  esac

  if [[ "$OS" == "Linux" ]]; then
    NODE_FILE="node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz"
  elif [[ "$OS" == "Darwin" ]]; then
    NODE_FILE="node-v${NODE_VERSION}-darwin-${NODE_ARCH}.tar.gz"
  else
    echo "[ERROR] Unsupported OS: $OS"
    echo "[INFO] This setup is designed for Linux and macOS (dev containers run Linux)"
    exit 1
  fi

  echo "[INFO] Downloading Node.js ${NODE_VERSION} for ${OS}-${NODE_ARCH}..."

  # Remove existing Node.js installation if it exists
  if command -v node &> /dev/null; then
    echo "[INFO] Removing existing Node.js installation..."
    if [[ "$OS" == "Linux" ]]; then
      rm -rf /usr/local/bin/node /usr/local/bin/npm /usr/local/bin/npx
    else
      # macOS - use brew or manual installation
      echo "[INFO] On macOS, please use: brew install node@${NODE_VERSION} or download from nodejs.org"
      echo "[INFO] Skipping automated Node.js installation on macOS"
      exit 1
    fi
  fi

  if [[ "$OS" == "Linux" ]]; then
    # Download and install Node.js binary
    cd /tmp
    wget -q https://nodejs.org/dist/v${NODE_VERSION}/${NODE_FILE}
    tar -C /usr/local --strip-components=1 -xf ${NODE_FILE}
    rm -f ${NODE_FILE}
    cd - > /dev/null

    # Create symlinks to ensure node is in PATH
    ln -sf /usr/local/bin/node /usr/bin/node
    ln -sf /usr/local/bin/npm /usr/bin/npm
    ln -sf /usr/local/bin/npx /usr/bin/npx
  fi
fi

if command -v node &> /dev/null; then
  echo "[INFO] Node.js version: $(node --version)"
else
  echo "[ERROR] Node.js installation failed"
  exit 1
fi

# Install pnpm
if ! command -v pnpm &> /dev/null; then
  # Get pnpm version from package.json
  PNPM_VERSION=$(grep '"packageManager"' package.json | sed 's/.*pnpm@\([^"]*\).*/\1/')
  echo "[INFO] Installing pnpm@${PNPM_VERSION}..."
  npm install -g pnpm@${PNPM_VERSION}
fi

# Install Go
if ! command -v go &> /dev/null; then
  echo "[INFO] Installing Go..."
  GO_VERSION="1.25.4"

  # Reuse architecture detection from Node.js section
  ARCH=$(uname -m)
  case "$ARCH" in
    x86_64|amd64)
      GO_ARCH="amd64"
      ;;
    aarch64|arm64)
      GO_ARCH="arm64"
      ;;
    *)
      echo "[ERROR] Unsupported architecture: $ARCH"
      exit 1
      ;;
  esac

  # Since dev containers run Linux, always use Linux packages
  GO_FILE="go${GO_VERSION}.linux-${GO_ARCH}.tar.gz"
  echo "[INFO] Downloading Go ${GO_VERSION} for linux-${GO_ARCH}..."

  wget -q https://go.dev/dl/${GO_FILE}
  rm -rf /usr/local/go
  tar -C /usr/local -xzf ${GO_FILE}
  echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
  export PATH=$PATH:/usr/local/go/bin
  rm -f ${GO_FILE}
fi

# Install uv (Python package manager)
if ! command -v uv &> /dev/null; then
  echo "[INFO] Installing uv..."
  curl -LsSf https://astral.sh/uv/install.sh | sh

  # Add uv to PATH for current session
  export PATH="$HOME/.cargo/bin:$PATH"

  # Add uv to PATH for future sessions
  echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc

  # Verify installation
  if command -v uv &> /dev/null; then
    echo "[INFO] uv installed: $(uv --version)"
  else
    echo "[ERROR] uv installation failed"
    exit 1
  fi
else
  echo "[INFO] uv already installed: $(uv --version)"
fi

# Install Doppler CLI
if ! command -v doppler &> /dev/null; then
  echo "[INFO] Installing Doppler CLI..."
  # Install dependencies
  apt-get update && apt-get install -y apt-transport-https ca-certificates curl gnupg
  # Add Doppler GPG key and repository
  curl -sLf --retry 3 --tlsv1.2 --proto "=https" 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg
  echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" | tee /etc/apt/sources.list.d/doppler-cli.list
  # Install Doppler CLI
  apt-get update && apt-get -y install doppler
fi

# Verify Doppler installation
if command -v doppler &> /dev/null; then
  DOPPLER_VERSION=$(doppler --version)
  echo "[INFO] Doppler CLI installed: ${DOPPLER_VERSION}"

  # Check if already authenticated
  if ! doppler whoami &> /dev/null; then
    echo ""
    echo "[INFO] Please authenticate with Doppler:"
    echo "[INFO] This will open a browser window to authorize access"
    echo ""
    doppler login || echo "[WARN] Doppler login failed. Please run 'doppler login' manually"
  else
    echo "[INFO] Already authenticated with Doppler as: $(doppler whoami)"
  fi

  # Setup Doppler project
  echo ""
  echo "[INFO] Setting up Doppler project..."

  # Prompt for config name
  CONFIG_NAME=""
  while [[ ! "$CONFIG_NAME" =~ ^dev_[a-zA-Z0-9_]+$ ]]; do
    echo "[INFO] Please enter your Doppler config name (format: dev_xxx):"
    read -p "> " CONFIG_NAME

    if [[ ! "$CONFIG_NAME" =~ ^dev_[a-zA-Z0-9_]+$ ]]; then
      echo "[ERROR] Invalid format. Config name must start with 'dev_' and contain only alphanumeric characters and underscores."
    fi
  done

  echo "[INFO] Setting up project with config: ${CONFIG_NAME}"
  doppler setup --project openpromo -c ${CONFIG_NAME} --no-interactive || echo "[WARN] Doppler setup failed. Please run 'doppler setup --project openpromo -c ${CONFIG_NAME}' manually"
else
  echo "[ERROR] Failed to install Doppler CLI"
fi


# Install dependencies
echo "[INFO] Installing dependencies..."
pnpm install

# Check Wrangler authentication
echo ""
if pnpm wrangler whoami &> /dev/null; then
  echo "[INFO] Already authenticated with Cloudflare as: $(pnpm wrangler whoami)"
else
  echo "[INFO] Please authenticate with Cloudflare Wrangler:"
  echo "[INFO] This will open a browser window to authorize access"
  echo ""
  pnpm wrangler login || echo "[WARN] Wrangler login failed. Please run 'pnpm wrangler login' manually"
fi


# Done
echo ""
echo "[INFO] Setup complete! Run 'pnpm dev' to start development"