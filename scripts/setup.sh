#!/bin/bash

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   log_error "This script should not be run as root"
   exit 1
fi

# Function to install Doppler
install_doppler() {
    log_info "Installing Doppler CLI..."
    
    # Check if doppler is already installed
    if command -v doppler &> /dev/null; then
        log_warn "Doppler CLI is already installed ($(doppler --version))"
        read -p "Do you want to reinstall? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi
    
    # Install Doppler
    if command -v curl &> /dev/null; then
        curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sudo sh
    elif command -v wget &> /dev/null; then
        wget -t 3 -qO- https://cli.doppler.com/install.sh | sudo sh
    else
        log_error "Neither curl nor wget is available. Please install one of them first."
        exit 1
    fi
    
    # Verify installation
    if command -v doppler &> /dev/null; then
        log_info "Doppler CLI installed successfully: $(doppler --version)"
    else
        log_error "Doppler CLI installation failed"
        exit 1
    fi
}

# Function to authenticate Doppler
authenticate_doppler() {
    log_info "Authenticating with Doppler..."
    
    # Check if already authenticated
    if doppler me &> /dev/null; then
        log_warn "Already authenticated with Doppler"
        read -p "Do you want to re-authenticate? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi
    
    doppler login
    
    # Verify authentication
    if doppler me &> /dev/null; then
        log_info "Successfully authenticated with Doppler"
    else
        log_error "Failed to authenticate with Doppler"
        exit 1
    fi
}

# Main execution
main() {
    log_info "Starting Doppler setup..."
    
    install_doppler
    authenticate_doppler
    
    log_info "Doppler setup completed successfully!"
}

# Run main function
main "$@"