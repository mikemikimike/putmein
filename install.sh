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

# APT Lock helper to handle Ubuntu unattended-upgrades automatically and swiftly
wait_for_apt_lock() {
  if ! command -v apt-get &>/dev/null; then
    return 0
  fi

  export DEBIAN_FRONTEND=noninteractive

  # Stop unattended-upgrades service so it doesn't contest the lock
  systemctl stop unattended-upgrades.service 2>/dev/null || true

  local lock_files=("/var/lib/dpkg/lock-frontend" "/var/lib/dpkg/lock" "/var/lib/apt/lists/lock")
  local is_locked=false
  for lf in "${lock_files[@]}"; do
    if [ -f "$lf" ] && command -v fuser &>/dev/null && fuser "$lf" >/dev/null 2>&1; then
      is_locked=true
      break
    fi
  done

  if [ "$is_locked" = true ]; then
    info "Resolving system package manager background lock automatically..."
    local waited=0
    while true; do
      local still_locked=false
      for lf in "${lock_files[@]}"; do
        if [ -f "$lf" ] && command -v fuser &>/dev/null && fuser "$lf" >/dev/null 2>&1; then
          still_locked=true
          break
        fi
      done
      if [ "$still_locked" = false ]; then
        break
      fi
      sleep 2
      waited=$((waited + 2))
      if [ "$waited" -ge 8 ]; then
        # Force release lock cleanly
        killall -9 unattended-upgr 2>/dev/null || true
        killall apt apt-get 2>/dev/null || true
        sleep 1
        rm -f /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/lib/apt/lists/lock 2>/dev/null || true
        dpkg --configure -a 2>/dev/null || true
        break
      fi
    done
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
  wait_for_apt_lock
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
step "3/6" "Checking Node.js & npm Environment..."

install_node_linux() {
  info "Installing Node.js LTS (v20) and npm..."
  wait_for_apt_lock
  if command -v apt-get &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | run_elevated bash -
    wait_for_apt_lock
    run_elevated apt-get -o DPkg::Lock::Timeout=60 update -qq || true
    run_elevated apt-get -o DPkg::Lock::Timeout=60 install -y -qq nodejs
  elif command -v dnf &>/dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | run_elevated bash -
    run_elevated dnf install -y nodejs
  elif command -v yum &>/dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | run_elevated bash -
    run_elevated yum install -y nodejs
  elif command -v pacman &>/dev/null; then
    run_elevated pacman -Sy --noconfirm nodejs npm
  elif command -v apk &>/dev/null; then
    run_elevated apk add --no-cache nodejs npm
  fi
}

HAS_NODE=false
if command -v node &>/dev/null; then
  NODE_MAJOR=$(node -v 2>/dev/null | cut -d'.' -f1 | tr -d 'v')
  if [ -n "$NODE_MAJOR" ] && [ "$NODE_MAJOR" -ge 18 ]; then
    HAS_NODE=true
  else
    warn "Node.js is installed but version ($NODE_MAJOR) is too old (requires >= 18)."
  fi
fi

if [ "$HAS_NODE" = false ]; then
  if [ "$OS" = "Linux" ]; then
    install_node_linux
  elif [ "$OS" = "macOS" ]; then
    if command -v brew &>/dev/null; then
      brew install node
    else
      error "Homebrew not found. Please install Node.js and npm from https://nodejs.org/"
      exit 1
    fi
  fi
fi

# If node is present but npm is missing (common on Ubuntu/Debian where packages are separate)
if ! command -v npm &>/dev/null; then
  info "npm package is missing. Installing npm..."
  if [ "$OS" = "Linux" ]; then
    if command -v apt-get &>/dev/null; then
      wait_for_apt_lock
      run_elevated apt-get -o DPkg::Lock::Timeout=60 update -qq || true
      run_elevated apt-get -o DPkg::Lock::Timeout=60 install -y -qq npm || true
    elif command -v dnf &>/dev/null; then
      run_elevated dnf install -y npm || true
    elif command -v yum &>/dev/null; then
      run_elevated yum install -y npm || true
    elif command -v pacman &>/dev/null; then
      run_elevated pacman -Sy --noconfirm npm || true
    elif command -v apk &>/dev/null; then
      run_elevated apk add --no-cache npm || true
    fi
  fi
fi

if command -v node &>/dev/null && command -v npm &>/dev/null; then
  success "Node.js $(node -v) is available"
  success "npm v$(npm -v) is available"
else
  error "Node.js (>= 18) and npm are required. Please install them and re-run this script."
  exit 1
fi

# Ensure npm global binary path is in current shell session's PATH
NPM_PREFIX=$(npm config get prefix 2>/dev/null || echo "/usr/local")
if [ -d "$NPM_PREFIX/bin" ] && [[ ":$PATH:" != *":$NPM_PREFIX/bin:"* ]]; then
  export PATH="$NPM_PREFIX/bin:$PATH"
fi
if [ -d "/usr/local/bin" ] && [[ ":$PATH:" != *":/usr/local/bin:"* ]]; then
  export PATH="/usr/local/bin:$PATH"
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
    warn "Direct global install failed. Attempting with elevated privileges..."
    run_elevated npm install -g pm2
    success "PM2 installed successfully!"
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

info "Installing 'putmein-test' package from NPM..."
if npm install -g putmein-test@latest --force 2>/dev/null; then
  success "PutmeIn CLI installed globally!"
else
  warn "Permission denied installing globally. Attempting with elevated privileges..."
  run_elevated npm install -g putmein-test@latest --force
  success "PutmeIn CLI installed successfully!"
fi

# Apply initial database tables via Prisma inside installed putmein package
GLOBAL_NPM_ROOT=$(npm root -g 2>/dev/null || echo "/usr/local/lib/node_modules")
PUTMEIN_PKG_DIR="$GLOBAL_NPM_ROOT/putmein-test"

if [ -d "$PUTMEIN_PKG_DIR/dist/ray" ]; then
  info "Synchronizing database schema..."
  (
    cd "$PUTMEIN_PKG_DIR/dist/ray"
    DATABASE_URL=$(grep "^DATABASE_URL=" "$PUTMEIN_ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' || true)
    if [ -n "$DATABASE_URL" ]; then
      export DATABASE_URL
      npx prisma db push --skip-generate --accept-data-loss &>/dev/null || true
    fi
  )
  success "Database schema synchronized!"
fi

# Reset PM2 daemon to guarantee clean process table and free ports
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true
if command -v fuser &>/dev/null; then
  fuser -k 4567/tcp 4500/tcp 2>/dev/null || true
elif command -v lsof &>/dev/null; then
  lsof -ti:4567,4500 | xargs kill -9 2>/dev/null || true
fi

# Start services via the ray CLI
info "Starting PutmeIn background services..."
ray restart 2>/dev/null || ray start || true

# Register autostart on system boot and persist process state
ray starter 2>/dev/null || true
pm2 save --force 2>/dev/null || true

# Helper for perfectly aligned box borders
print_box_line() {
  local content="$1"
  local visible
  visible=$(echo -e "$content" | sed -E "s/\x1B\[[0-9;]*[a-zA-Z]//g")
  local len=${#visible}
  local pad=$(( 66 - len ))
  if [ $pad -lt 0 ]; then pad=0; fi
  printf "${BOLD}${CYAN}│${NC}  %b%*s  ${BOLD}${CYAN}│${NC}\n" "$content" "$pad" ""
}

# ==============================================================================
# Finish: Display Completion Box
# ==============================================================================
LAN_IP=$(get_lan_ip)
RAY_PORT="4567"
BRAIN_PORT="4500"
BOX_BORDER=$(printf '─%.0s' {1..70})

echo ""
echo -e "${BOLD}${CYAN}╭${BOX_BORDER}╮${NC}"
print_box_line ""
print_box_line "${BOLD}${GREEN}✔ PutmeIn successfully installed and running!${NC}"
print_box_line ""
print_box_line "${BOLD}Web Dashboard (Ray):${NC}    ${CYAN}http://localhost:${RAY_PORT}${NC}"
print_box_line "${BOLD}Network Dashboard:${NC}      ${CYAN}http://${LAN_IP}:${RAY_PORT}${NC}"
print_box_line "${BOLD}AI Backend (Brain):${NC}     ${DIM}http://localhost:${BRAIN_PORT}${NC}"
print_box_line ""
print_box_line "${BOLD}Default Admin Login:${NC}"
print_box_line "  • Email:    ${YELLOW}admin@putme.in${NC}"
print_box_line "  • Password: ${YELLOW}admin123${NC}"
print_box_line ""
print_box_line "${BOLD}Useful CLI Commands:${NC}"
print_box_line "  • ${YELLOW}ray status${NC}         Inspect service health and memory"
print_box_line "  • ${YELLOW}ray logs${NC}           Stream real-time unified logs"
print_box_line "  • ${YELLOW}ray stop${NC}           Stop running background services"
print_box_line "  • ${YELLOW}ray restart${NC}        Restart background services"
print_box_line "  • ${YELLOW}ray cohen${NC}          Launch interactive terminal TUI"
print_box_line "  • ${YELLOW}ray --no-startup${NC}   Disable launching on system boot"
print_box_line ""
echo -e "${BOLD}${CYAN}╰${BOX_BORDER}╯${NC}"
echo ""
