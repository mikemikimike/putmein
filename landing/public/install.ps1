# ==============================================================================
# PutmeIn Windows Installation Script (PowerShell)
# Usage: irm https://get.putme.in/ps1 | iex
# ==============================================================================

$ErrorActionPreference = "Stop"

function Write-Color([string]$text, [ConsoleColor]$color) {
    Write-Host $text -ForegroundColor $color
}

function Write-Step([string]$step, [string]$title) {
    Write-Host ""
    Write-Host "[$step] " -ForegroundColor Cyan -NoNewline
    Write-Host $title -ForegroundColor White
}

function Write-Success([string]$msg) {
    Write-Host "  [OK] " -ForegroundColor Green -NoNewline
    Write-Host $msg -ForegroundColor White
}

function Write-WarnMsg([string]$msg) {
    Write-Host "  [WARN] " -ForegroundColor Yellow -NoNewline
    Write-Host $msg -ForegroundColor White
}

function Write-ErrorMsg([string]$msg) {
    Write-Host "  [ERROR] " -ForegroundColor Red -NoNewline
    Write-Host $msg -ForegroundColor White
}

Clear-Host
Write-Color "   ___       __                ____     " Cyan
Write-Color "  / _ \__ __/ /_  __ _  ___   /  _/__   " Cyan
Write-Color " / ___/ // / __/ /  ' \/ -_) _/ // _ \  " Cyan
Write-Color "/_/   \_,_/\__/ /_/_/_/\__/ /___/_//_/  " Cyan
Write-Host ""
Write-Color "Autonomous DevOps, Infrastructure Monitoring & Deployment Engine" White
Write-Color "Windows Installer • https://putme.in" DarkGray
Write-Host "────────────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray

# ==============================================================================
# Step 1: Detect Windows Environment
# ==============================================================================
Write-Step "1/6" "Detecting System Environment..."
$arch = $env:PROCESSOR_ARCHITECTURE
Write-Success "Operating System: Windows ($arch)"

# ==============================================================================
# Step 2: Check Docker Engine
# ==============================================================================
Write-Step "2/6" "Checking Docker Engine..."
$hasDocker = Get-Command docker -ErrorAction SilentlyContinue

if ($hasDocker) {
    try {
        docker info 2>&1 | Out-Null
        $dockerVer = (docker --version)
        Write-Success "Docker is running ($dockerVer)"
    } catch {
        Write-WarnMsg "Docker is installed but the Docker Desktop daemon is not running."
        Write-WarnMsg "Please launch Docker Desktop and ensure it has completed initialization."
    }
} else {
    Write-WarnMsg "Docker was not found on your system."
    $hasWinget = Get-Command winget -ErrorAction SilentlyContinue
    if ($hasWinget) {
        Write-Color "  Installing Docker Desktop via winget..." Cyan
        winget install Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
        Write-Success "Docker Desktop installed. Please launch it and restart this script."
    } else {
        Write-WarnMsg "Please install Docker Desktop from https://www.docker.com/products/docker-desktop/"
    }
}

# ==============================================================================
# Step 3: Check Node.js and NPM
# ==============================================================================
Write-Step "3/6" "Checking Node.js Environment..."
$hasNode = Get-Command node -ErrorAction SilentlyContinue
$needNode = $false

if ($hasNode) {
    $nodeVer = (node -v).TrimStart("v")
    $major = [int]($nodeVer.Split(".")[0])
    if ($major -lt 18) {
        Write-WarnMsg "Node.js version ($nodeVer) is too old. Requires >= 18."
        $needNode = $true
    } else {
        Write-Success "Node.js v$nodeVer is ready."
        Write-Success "NPM v$((npm -v)) is ready."
    }
} else {
    $needNode = $true
}

if ($needNode) {
    $hasWinget = Get-Command winget -ErrorAction SilentlyContinue
    if ($hasWinget) {
        Write-Color "  Installing Node.js LTS via winget..." Cyan
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        Write-Success "Node.js installed successfully!"
    } else {
        Write-ErrorMsg "Please install Node.js (LTS) from https://nodejs.org/"
        exit 1
    }
}

# ==============================================================================
# Step 4: Check PM2
# ==============================================================================
Write-Step "4/6" "Checking Process Manager (PM2)..."
$hasPm2 = Get-Command pm2 -ErrorAction SilentlyContinue

if ($hasPm2) {
    Write-Success "PM2 is ready ($((pm2 -v)))."
} else {
    Write-Color "  Installing PM2 globally..." Cyan
    npm install -g pm2
    Write-Success "PM2 installed globally!"
}

# ==============================================================================
# Step 5: Configure Local MySQL Database
# ==============================================================================
Write-Step "5/6" "Configuring Database & Environment..."
$configDir = Join-Path $env:USERPROFILE ".putmein"
if (!(Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

$envFile = Join-Path $configDir ".env"
$mysqlContainer = "putmein-mysql"
$mysqlPort = "3306"

$existingContainers = docker ps -a --format "{{.Names}}" 2>$null
if ($existingContainers -contains $mysqlContainer) {
    $runningContainers = docker ps --format "{{.Names}}" 2>$null
    if ($runningContainers -contains $mysqlContainer) {
        Write-Success "Persistent MySQL container ($mysqlContainer) is running."
    } else {
        docker start $mysqlContainer | Out-Null
        Write-Success "Started existing MySQL container."
    }
} else {
    # Generate random password
    $bytes = New-Object byte[] 16
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $dbPassword = [BitConverter]::ToString($bytes).Replace("-", "").ToLower()

    Write-Color "  Creating dedicated MySQL container on port $mysqlPort..." Cyan
    docker run -d `
        --name $mysqlContainer `
        --restart unless-stopped `
        -p "127.0.0.1:${mysqlPort}:3306" `
        -e "MYSQL_ROOT_PASSWORD=$dbPassword" `
        -e "MYSQL_DATABASE=putmein" `
        -v "putmein_mysql_data:/var/lib/mysql" `
        mysql:8.0 | Out-Null

    $secretBytes = New-Object byte[] 8
    $rng.GetBytes($secretBytes)
    $secret = [BitConverter]::ToString($secretBytes).Replace("-", "").ToLower()

    $envContent = @"
DATABASE_URL="mysql://root:${dbPassword}@127.0.0.1:${mysqlPort}/putmein"
RAY_PORT=4567
BRAIN_PORT=4500
RAY_URL="http://localhost:4567"
BRAIN_URL="http://localhost:4500"
NEXT_PUBLIC_BRAIN_URL="http://localhost:4500"
BRAIN_INTERNAL_SECRET="putmein-sec-$secret"
AGENT_AUTONOMOUS="false"
"@
    Set-Content -Path $envFile -Value $envContent
    Write-Success "Database configured and credentials saved to $envFile"

    # Wait for MySQL readiness
    Write-Host "  Waiting for database engine to accept connections..." -ForegroundColor Cyan -NoNewline
    for ($i = 1; $i -le 30; $i++) {
        $ping = docker exec $mysqlContainer mysqladmin ping -h localhost -uroot -p"$dbPassword" 2>$null
        if ($ping -match "alive") {
            break
        }
        Start-Sleep -Seconds 1
        Write-Host "." -ForegroundColor Cyan -NoNewline
    }
    Write-Host ""
    Write-Success "Database engine ready!"
}

# ==============================================================================
# Step 6: Install PutmeIn Global Package & Launch
# ==============================================================================
Write-Step "6/6" "Installing PutmeIn Engine & Starting Services..."
Write-Color "  Installing putmein-test package from NPM..." Cyan
npm install -g putmein-test

# Start services via ray CLI
Write-Color "  Starting PutmeIn services..." Cyan
ray start

# Output Finish
Write-Host ""
Write-Host "╭────────────────────────────────────────────────────────────────────────╮" -ForegroundColor Cyan
Write-Host "│                                                                        │" -ForegroundColor Cyan
Write-Host "│   PutmeIn successfully installed and running!                         │" -ForegroundColor Green
Write-Host "│                                                                        │" -ForegroundColor Cyan
Write-Host "│   Web Dashboard (Ray):    http://localhost:4567                         │" -ForegroundColor White
Write-Host "│   AI Backend (Brain):     http://localhost:4500                         │" -ForegroundColor DarkGray
Write-Host "│                                                                        │" -ForegroundColor Cyan
Write-Host "│   Useful CLI Commands:                                                 │" -ForegroundColor White
Write-Host "│     • ray status         Inspect service health and memory            │" -ForegroundColor Yellow
Write-Host "│     • ray logs           Stream real-time unified logs                │" -ForegroundColor Yellow
Write-Host "│     • ray stop           Stop running background services             │" -ForegroundColor Yellow
Write-Host "│     • ray restart        Restart background services                  │" -ForegroundColor Yellow
Write-Host "│     • ray cohen          Launch the interactive terminal TUI          │" -ForegroundColor Yellow
Write-Host "│                                                                        │" -ForegroundColor Cyan
Write-Host "╰────────────────────────────────────────────────────────────────────────╯" -ForegroundColor Cyan
Write-Host ""
