#!/bin/bash

# ==============================================================================
# Terminal Colors & Formatting
# ==============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ==============================================================================
# Helper Functions
# ==============================================================================
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Print a nice welcome banner
echo -e "\n${BOLD}${BLUE}===================================================${NC}"
echo -e "${BOLD}${GREEN}        Welcome to the putmein Setup Wizard        ${NC}"
echo -e "${BOLD}${BLUE}===================================================${NC}\n"

# ==============================================================================
# 1. Check and Install Node.js
# ==============================================================================
info "Checking system requirements..."

if ! command -v node &> /dev/null; then
    warn "Node.js is not installed."
    info "Attempting to install Node.js..."
    
    # Detect package manager
    if command -v apt-get &> /dev/null; then
        info "Debian/Ubuntu based system detected."
        info "Fetching NodeSource LTS setup script..."
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
        
    elif command -v brew &> /dev/null; then
        info "macOS detected."
        brew install node
        
    else
        error "Could not determine package manager (neither apt nor brew found)."
        error "Please install Node.js manually from https://nodejs.org/ and run this script again."
        exit 1
    fi
    
    # Verify installation succeeded
    if command -v node &> /dev/null; then
        success "Node.js installed successfully! ($(node -v))"
    else
        error "Node.js installation failed. Please install it manually."
        exit 1
    fi
else
    success "Node.js is already installed: $(node -v)"
fi

# ==============================================================================
# 2. Check npm
# ==============================================================================
if ! command -v npm &> /dev/null; then
    error "npm is not recognized, even though Node.js is installed."
    error "Please fix your Node/npm installation and try again."
    exit 1
else
    success "npm is available: v$(npm -v)"
fi

# ==============================================================================
# 3. Install the specific script globally
# ==============================================================================
echo -e "\n${BOLD}Installing dependencies...${NC}"
info "Running: npm install -g putmein"

# Try to install normally first. If it fails (usually due to EACCES permissions on Linux), try with sudo.
if npm i -g putmein; then
    echo ""
    success "'putmein' was installed successfully!"
else
    warn "Standard install failed, likely due to folder permissions."
    info "Attempting to install with elevated privileges (sudo)..."
    
    if sudo npm i -g putmein; then
        echo ""
        success "'putmein' was installed successfully using sudo!"
    else
        echo ""
        error "Installation failed. Please check the npm error logs above."
        exit 1
    fi
fi

# ==============================================================================
# Finish
# ==============================================================================
echo -e "\n${BOLD}${GREEN}===================================================${NC}"
echo -e "${BOLD}${GREEN}   Setup Complete! You can now run 'putmein'.      ${NC}"
echo -e "${BOLD}${GREEN}===================================================${NC}\n"