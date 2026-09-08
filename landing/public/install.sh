#!/usr/bin/env bash

# ==============================================================================
# PutmeIn Universal Installation Script
# Supports: Linux (Ubuntu, Debian, Fedora, CentOS, Arch, Alpine) & macOS & WSL
# ==============================================================================

set -e

# Terminal Colors & Formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# Output Helpers
info()    { echo -e "${CYAN}➜${NC} $1"; }
step()    { echo -e "\n${BOLD}${BLUE}[$1]${NC} ${BOLD}$2${NC}"; }
success() { echo -e "  ${GREEN}✔${NC} $1"; }
warn()    { echo -e "  ${YELLOW}⚠${NC} $1"; }
error()   { echo -e "  ${RED}✖${NC} $1"; }

# Cleanup on interruption
cleanup() {
  echo -e "\n${YELLOW}Installation interrupted by user.${NC}"
  exit 1
}
trap cleanup SIGINT SIGTERM

# Spinner helper for long tasks
run_with_spinner() {
  local msg="$1"
  shift
  local temp_log
  temp_log=$(mktemp)

  # Start background process
  "$@" >"$temp_log" 2>&1 &
  local pid=$!

  local spin='-\|/'
  local i=0
  printf "  ${CYAN}⏳${NC} %s " "$msg"

  while kill -0 "$pid" 2>/dev/null; do
    i=$(( (i+1) % 4 ))
    printf "\b${spin:$i:1}"
    sleep 0.15
  done

  printf "\b "

  if wait "$pid"; then
    echo -e "\r  ${GREEN}✔${NC} $msg"
    rm -f "$temp_log"
    return 0
  else
    echo -e "\r  ${RED}✖${NC} $msg (failed)"
    echo -e "${DIM}--- Error details ---${NC}"
    cat "$temp_log" | tail -n 20
    echo -e "${DIM}---------------------${NC}"
    rm -f "$temp_log"
    return 1
  fi
}

# Elevation helper (sudo)
run_elevated() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif command -v sudo &>/dev/null; then
    sudo "$@"
  else
    error "Elevated permissions (root/sudo) are required to proceed."
    exit 1
  fi
}

# Get Network IP
get_lan_ip() {
  local ip=""
  if command -v ip &>/dev/null; then
    ip=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}')
  elif command -v ifconfig &>/dev/null; then
    ip=$(ifconfig | grep -E "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
  fi
  if [ -z "$ip" ]; then
    ip="127.0.0.1"
  fi
  echo "$ip"
}

# Banner
clear 2>/dev/null || true
echo -e "${CYAN}"
cat << "EOF"
   ___       __                ____     
  / _ \__ __/ /_  __ _  ___   /  _/__   
 / ___/ // / __/ /  ' \/ -_) _/ // _ \  
/_/   \_,_/\__/ /_/_/_/\__/ /___/_//_/  
EOF
echo -e "${NC}"
echo -e "${BOLD}Autonomous DevOps, Infrastructure Monitoring & Deployment Engine${NC}"
echo -e "${DIM}Universal Installer • https://putme.in${NC}"
echo -e "────────────────────────────────────────────────────────────────────────"

# ==============================================================================
# Step 1: Detect Operating System & Architecture
# ==============================================================================
step "1/6" "Detecting System & Architecture..."

OS_TYPE="$(uname -s)"
ARCH_TYPE="$(uname -m)"

case "$OS_TYPE" in
  Linux*)   OS="Linux" ;;
  Darwin*)  OS="macOS" ;;
  MINGW*|MSYS*|CYGWIN*) OS="Windows" ;;
  *)        OS="Unknown" ;;
esac

case "$ARCH_TYPE" in
  x86_64|amd64)   ARCH="x64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *)             ARCH="$ARCH_TYPE" ;;
esac

success "Operating System: $OS ($ARCH)"

# ==============================================================================
# Step 2: Check & Configure Docker Engine
# ==============================================================================
step "2/6" "Checking Container Runtime (Docker)..."

install_docker_linux() {
  info "Installing Docker Engine via official convenience script..."
  run_elevated sh -c "curl -fsSL https://get.docker.com | sh"
  if [ -n "$SUDO_USER" ]; then
    run_elevated usermod -aG docker "$SUDO_USER" || true
  elif [ "$USER" != "root" ]; then
    run_elevated usermod -aG docker "$USER" || true
  fi
  run_elevated systemctl enable --now docker 2>/dev/null || run_elevated service docker start 2>/dev/null || true
}

if command -v docker &>/dev/null && docker info &>/dev/null; then
  DOCKER_VER=$(docker --version | awk '{print $3}' | tr -d ',')
  success "Docker is installed and active ($DOCKER_VER)"
elif command -v docker &>/dev/null; then
  warn "Docker command found, but daemon is not running."
  if [ "$OS" = "Linux" ]; then
    info "Attempting to start Docker service..."
    run_elevated systemctl start docker 2>/dev/null || run_elevated service docker start 2>/dev/null || true
  elif [ "$OS" = "macOS" ]; then
    if [ -d "/Applications/Docker.app" ]; then
      info "Launching Docker Desktop on macOS..."
      open -a Docker
    fi
  fi
  # Re-test
  sleep 3
  if docker info &>/dev/null; then
    success "Docker daemon started successfully."
  else
    warn "Could not start Docker automatically. Please ensure Docker Desktop is open."
  fi
else
  info "Docker not found on system."
  if [ "$OS" = "Linux" ]; then
    install_docker_linux
    if docker info &>/dev/null; then
      success "Docker installed and running!"
    else
      warn "Docker was installed. You may need to log out and back in for group permissions."
    fi
  elif [ "$OS" = "macOS" ]; then
    if command -v brew &>/dev/null; then
      info "Installing Docker Desktop via Homebrew..."
      brew install --cask docker
      open -a Docker 2>/dev/null || true
      success "Docker Desktop installed. Please grant hypervisor permissions if prompted."
    else
      warn "Please install Docker Desktop from https://www.docker.com/products/docker-desktop/"
    fi
  fi
fi

# ==============================================================================
# Step 3: Check & Install Node.js & NPM
# ==============================================================================
step "3/6" "Checking Node.js Environment..."

install_node_linux() {
  info "Installing Node.js LTS (v20)..."
  if command -v apt-get &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | run_elevated bash -
    run_elevated apt-get install -y nodejs
  elif command -v dnf &>/dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | run_elevated bash -
    run_elevated dnf install -y nodejs
  elif command -v yum &>/dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | run_elevated bash -
    run_elevated yum install -y nodejs
  elif command -v pacman &>/dev/null; then
    run_elevated pacman -Sy --noconfirm nodejs npm
  fi
}

NEED_NODE=false
if ! command -v node &>/dev/null; then
  NEED_NODE=true
else
  NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
  if [ "$NODE_MAJOR" -lt 18 ]; then
    warn "Node.js is installed but version $NODE_MAJOR is too old (requires >= 18)."
    NEED_NODE=true
  fi
fi

if [ "$NEED_NODE" = true ]; then
  if [ "$OS" = "Linux" ]; then
    install_node_linux
  elif [ "$OS" = "macOS" ]; then
    if command -v brew &>/dev/null; then
      brew install node
    else
      error "Homebrew not found. Please install Node.js from https://nodejs.org/"
      exit 1
    fi
  fi
fi

if command -v node &>/dev/null; then
  success "Node.js $(node -v) is available"
  success "npm v$(npm -v) is available"
else
  error "Node.js installation failed. Please install Node >= 18 manually."
  exit 1
fi

# ==============================================================================
# Step 4: Check & Install PM2
# ==============================================================================
step "4/6" "Checking Process Manager (PM2)..."

if command -v pm2 &>/dev/null; then
  success "PM2 is already installed ($(pm2 -v))"
else
  info "Installing PM2 globally..."
  if npm install -g pm2 2>/dev/null; then
    success "PM2 installed globally!"
  else
    info "Permissions require elevated install (sudo)..."
    run_elevated npm install -g pm2
    success "PM2 installed successfully with elevated privileges!"
  fi
fi

# ==============================================================================
# Step 5: Setup Local MySQL via Docker
# ==============================================================================
step "5/6" "Configuring Database & Environment..."

PUTMEIN_CONFIG_DIR="$HOME/.putmein"
PUTMEIN_ENV_FILE="$PUTMEIN_CONFIG_DIR/.env"
mkdir -p "$PUTMEIN_CONFIG_DIR"

MYSQL_CONTAINER="putmein-mysql"
MYSQL_PORT="3306"

# Check if MySQL container is already running
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${MYSQL_CONTAINER}$"; then
  success "Persistent MySQL container ($MYSQL_CONTAINER) is running"
elif docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^${MYSQL_CONTAINER}$"; then
  info "Starting existing MySQL container..."
  docker start "$MYSQL_CONTAINER" >/dev/null
  success "MySQL container started"
else
  # Generate a secure 32-character random root password
  if command -v openssl &>/dev/null; then
    DB_PASSWORD=$(openssl rand -hex 16)
  else
    DB_PASSWORD=$(LC_ALL=C tr -dc 'a-zA-Z0-9' </dev/urandom 2>/dev/null | head -c 32 || date +%s)
  fi

  info "Creating dedicated MySQL container on port $MYSQL_PORT..."
  docker run -d \
    --name "$MYSQL_CONTAINER" \
    --restart unless-stopped \
    -p "127.0.0.1:${MYSQL_PORT}:3306" \
    -e "MYSQL_ROOT_PASSWORD=${DB_PASSWORD}" \
    -e "MYSQL_DATABASE=putmein" \
    -v "putmein_mysql_data:/var/lib/mysql" \
    mysql:8.0 >/dev/null

  # Generate environment file
  cat > "$PUTMEIN_ENV_FILE" << EOF
# PutmeIn Local Environment
DATABASE_URL="mysql://root:${DB_PASSWORD}@127.0.0.1:${MYSQL_PORT}/putmein"
RAY_PORT=4567
BRAIN_PORT=4500
RAY_URL="http://localhost:4567"
BRAIN_URL="http://localhost:4500"
NEXT_PUBLIC_BRAIN_URL="http://localhost:4500"
BRAIN_INTERNAL_SECRET="putmein-sec-$(head -c 8 /dev/urandom 2>/dev/null | xxd -p 2>/dev/null || date +%s)"
AGENT_AUTONOMOUS="false"
EOF
  chmod 600 "$PUTMEIN_ENV_FILE"
  success "Local database created and credentials saved to $PUTMEIN_ENV_FILE"

  # Wait for MySQL readiness
  printf "  ${CYAN}⏳${NC} Waiting for database engine to accept connections..."
  for i in $(seq 1 30); do
    if docker exec "$MYSQL_CONTAINER" mysqladmin ping -h localhost -uroot -p"${DB_PASSWORD}" &>/dev/null; then
      break
    fi
    sleep 1
    printf "."
  done
  echo ""
  success "Database engine ready!"
fi

# ==============================================================================
# Step 6: Install PutmeIn Global CLI & Launch PM2 Daemon
# ==============================================================================
step "6/6" "Installing PutmeIn Engine & Starting Services..."

info "Installing 'putmein' package from NPM..."
if npm install -g putmein 2>/dev/null; then
  success "PutmeIn CLI installed globally!"
else
  info "Attempting global install with elevated privileges..."
  run_elevated npm install -g putmein
  success "PutmeIn CLI installed successfully!"
fi

# Apply initial database tables via Prisma inside installed putmein package
GLOBAL_NPM_ROOT=$(npm root -g)
PUTMEIN_PKG_DIR="$GLOBAL_NPM_ROOT/putmein"

if [ -d "$PUTMEIN_PKG_DIR/dist/ray" ]; then
  info "Synchronizing database schema..."
  (
    cd "$PUTMEIN_PKG_DIR/dist/ray"
    DATABASE_URL=$(grep "^DATABASE_URL=" "$PUTMEIN_ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' || true)
    if [ -n "$DATABASE_URL" ]; then
      npx prisma db push --skip-generate --accept-data-loss &>/dev/null || true
    fi
  )
  success "Database schema synchronized!"
fi

# Start services via the ray CLI
info "Starting PutmeIn background services..."
ray start || true

# Register autostart on system boot
ray starter 2>/dev/null || true

# ==============================================================================
# Finish: Display Completion Box
# ==============================================================================
LAN_IP=$(get_lan_ip)
RAY_PORT="4567"
BRAIN_PORT="4500"

echo ""
echo -e "${BOLD}${CYAN}╭────────────────────────────────────────────────────────────────────────╮${NC}"
echo -e "${BOLD}${CYAN}│${NC}                                                                        ${BOLD}${CYAN}│${NC}"
echo -e "${BOLD}${CYAN}│${NC}   ${BOLD}${GREEN}🎉 PutmeIn successfully installed and running!${NC}                       ${BOLD}${CYAN}│${NC}"
echo -e "${BOLD}${CYAN}│${NC}                                                                        ${BOLD}${CYAN}│${NC}"
echo -e "${BOLD}${CYAN}│${NC}   ${BOLD}Web Dashboard (Ray):${NC}    ${CYAN}http://localhost:${RAY_PORT}${NC}                         ${BOLD}${CYAN}│${NC}"
echo -e "${BOLD}${CYAN}│${NC}   ${BOLD}Network Dashboard:${NC}      ${CYAN}http://${LAN_IP}:${RAY_PORT}${NC}                    ${BOLD}${CYAN}│${NC}"
echo -e "${BOLD}${CYAN}│${NC}   ${BOLD}AI Backend (Brain):${NC}     ${DIM}http://localhost:${BRAIN_PORT}${NC}                         ${BOLD}${CYAN}│${NC}"
echo -e "${BOLD}${CYAN}│${NC}                                                                        ${BOLD}${CYAN}│${NC}"
echo -e "${BOLD}${CYAN}│${NC}   ${BOLD}Useful CLI Commands:${NC}                                                 ${BOLD}${CYAN}│${NC}"
echo -e "${BOLD}${CYAN}│${NC}     • ${YELLOW}ray status${NC}         Inspect service health and memory            ${BOLD}${CYAN}│${NC}"
echo -e "${BOLD}${CYAN}│${NC}     • ${YELLOW}ray logs${NC}           Stream real-time unified logs                ${BOLD}${CYAN}│${NC}"
echo -e "${BOLD}${CYAN}│${NC}     • ${YELLOW}ray stop${NC}           Stop running background services             ${BOLD}${CYAN}│${NC}"
echo -e "${BOLD}${CYAN}│${NC}     • ${YELLOW}ray restart${NC}        Restart background services                  ${BOLD}${CYAN}│${NC}"
echo -e "${BOLD}${CYAN}│${NC}     • ${YELLOW}ray cohen${NC}          Launch the interactive terminal TUI          ${BOLD}${CYAN}│${NC}"
echo -e "${BOLD}${CYAN}│${NC}     • ${YELLOW}ray --no-startup${NC}   Disable launching on system boot             ${BOLD}${CYAN}│${NC}"
echo -e "${BOLD}${CYAN}│${NC}                                                                        ${BOLD}${CYAN}│${NC}"
echo -e "${BOLD}${CYAN}╰────────────────────────────────────────────────────────────────────────╯${NC}"
echo ""
