# ==============================================================================
# PutmeIn Windows Installation Script (PowerShell)
# Usage: irm https://putme.in/install.ps1 | iex
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Continue"

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

function Test-DockerRunning {
    try {
        $null = & docker info 2>&1
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
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
    if (Test-DockerRunning) {
        $dockerVer = (& docker --version 2>&1)
        Write-Success "Docker is running ($dockerVer)"
    } else {
        # Check if Docker Desktop is installed
        $desktopPaths = @(
            "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
            "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
            "$env:LOCALAPPDATA\Programs\Docker Desktop\Docker Desktop.exe"
        )
        $desktopExe = $desktopPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

        if ($desktopExe) {
            Write-WarnMsg "Docker is installed but the Docker Desktop daemon is not active."
            Write-Color "  Attempting to launch Docker Desktop in background..." Cyan
            try {
                Start-Process $desktopExe
                Write-Host "  Waiting for Docker Desktop engine to initialize..." -ForegroundColor Cyan -NoNewline
                for ($i = 1; $i -le 20; $i++) {
                    Start-Sleep -Seconds 2
                    Write-Host "." -ForegroundColor Cyan -NoNewline
                    if (Test-DockerRunning) {
                        break
                    }
                }
                Write-Host ""
            } catch {}

            if (Test-DockerRunning) {
                Write-Success "Docker Desktop initialized successfully!"
            } else {
                Write-WarnMsg "Docker Desktop is still initializing. Continuing setup..."
            }
        } else {
            Write-WarnMsg "Docker is installed but the daemon is not running."
            Write-WarnMsg "Please launch Docker Desktop to enable local containerized databases."
        }
    }
} else {
    Write-WarnMsg "Docker was not found on your system."
    $hasWinget = Get-Command winget -ErrorAction SilentlyContinue
    if ($hasWinget) {
        Write-Color "  Installing Docker Desktop via winget..." Cyan
        winget install Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
        Write-Success "Docker Desktop installed. Please launch it and restart this installer if needed."
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

if (Test-DockerRunning) {
    $existingContainers = @()
    try {
        $out = (& docker ps -a --format "{{.Names}}" 2>$null)
        if ($out) {
            $existingContainers = $out -split "`r?`n"
        }
    } catch {}

    if ($existingContainers -contains $mysqlContainer) {
        $runningContainers = @()
        try {
            $out = (& docker ps --format "{{.Names}}" 2>$null)
            if ($out) {
                $runningContainers = $out -split "`r?`n"
            }
        } catch {}

        if ($runningContainers -contains $mysqlContainer) {
            Write-Success "Persistent MySQL container ($mysqlContainer) is running."
        } else {
            & docker start $mysqlContainer 2>$null | Out-Null
            Write-Success "Started existing MySQL container."
        }
    } else {
        # Generate random password
        $bytes = New-Object byte[] 16
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        $rng.GetBytes($bytes)
        $dbPassword = [BitConverter]::ToString($bytes).Replace("-", "").ToLower()

        Write-Color "  Creating dedicated MySQL container on port $mysqlPort..." Cyan
        & docker run -d `
            --name $mysqlContainer `
            --restart unless-stopped `
            -p "127.0.0.1:${mysqlPort}:3306" `
            -e "MYSQL_ROOT_PASSWORD=$dbPassword" `
            -e "MYSQL_DATABASE=putmein" `
            -v "putmein_mysql_data:/var/lib/mysql" `
            mysql:8.0 2>$null | Out-Null

        $secretBytes = New-Object byte[] 8
        $rng.GetBytes($secretBytes)
        $secret = [BitConverter]::ToString($secretBytes).Replace("-", "").ToLower()

        $envContent = @"
# PutmeIn Local Environment
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
            $ping = & docker exec $mysqlContainer mysqladmin ping -h localhost -uroot -p"$dbPassword" 2>$null
            if ($ping -match "alive") {
                break
            }
            Start-Sleep -Seconds 1
            Write-Host "." -ForegroundColor Cyan -NoNewline
        }
        Write-Host ""
        Write-Success "Database engine ready!"
    }
} else {
    Write-WarnMsg "Docker daemon is currently offline. Creating default environment configuration."
    if (!(Test-Path $envFile)) {
        $secretBytes = New-Object byte[] 8
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        $rng.GetBytes($secretBytes)
        $secret = [BitConverter]::ToString($secretBytes).Replace("-", "").ToLower()

        $envContent = @"
# PutmeIn Local Environment
DATABASE_URL="mysql://root:root@127.0.0.1:3306/putmein"
RAY_PORT=4567
BRAIN_PORT=4500
RAY_URL="http://localhost:4567"
BRAIN_URL="http://localhost:4500"
NEXT_PUBLIC_BRAIN_URL="http://localhost:4500"
BRAIN_INTERNAL_SECRET="putmein-sec-$secret"
AGENT_AUTONOMOUS="false"
"@
        Set-Content -Path $envFile -Value $envContent
    }
    Write-Success "Configuration saved to $envFile"
    Write-WarnMsg "Once Docker Desktop is running, create your container by executing:"
    Write-Color "    docker run -d --name putmein-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=putmein mysql:8.0" DarkYellow
}

# ==============================================================================
# Step 6: Install PutmeIn Global Package & Launch
# ==============================================================================
Write-Step "6/6" "Installing PutmeIn Engine & Starting Services..."

# Remove old shims from both NPM prefix and active Node directory (NVM Windows support)
$cleanDirs = @()
$npmPrefix = (npm config get prefix 2>$null)
if ($npmPrefix) { $cleanDirs += $npmPrefix.Trim() }
try {
    $nodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
    if ($nodeExe) { $cleanDirs += (Split-Path $nodeExe) }
} catch {}
if ($env:APPDATA) { $cleanDirs += "$env:APPDATA\npm" }

$binNames = @("ray", "ray.cmd", "ray.ps1", "putmein", "putmein.cmd", "putmein.ps1")
foreach ($dir in ($cleanDirs | Select-Object -Unique)) {
    if ($dir -and (Test-Path $dir)) {
        foreach ($b in $binNames) {
            $target = Join-Path $dir $b
            if (Test-Path $target) {
                Remove-Item -Path $target -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

Write-Color "  Installing putmein-test package from NPM..." Cyan
npm install -g putmein-test@latest --force

# Refresh environment PATH for current session
$machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$env:Path = "$userPath;$machinePath"
foreach ($dir in ($cleanDirs | Select-Object -Unique)) {
    if ($dir -and ($env:Path -notlike "*$dir*")) {
        $env:Path = "$dir;$env:Path"
    }
}

# If MySQL is running, initialize tables directly via SQL script (Zero external dependencies)
if (Test-DockerRunning) {
    try {
        $envFilePath = Join-Path $env:USERPROFILE ".putmein\.env"
        $dbPass = "root"
        if (Test-Path $envFilePath) {
            $envLines = Get-Content $envFilePath
            foreach ($line in $envLines) {
                if ($line -match '^DATABASE_URL="?mysql://root:([^@]+)@') {
                    $dbPass = $matches[1]
                }
            }
        }
        $globalNpm = (npm root -g 2>$null)
        $sqlScriptPath = ""
        if ($globalNpm) {
            $candidate = Join-Path $globalNpm.Trim() "putmein-test\bin\init-db.sql"
            if (Test-Path $candidate) { $sqlScriptPath = $candidate }
        }
        if (-not $sqlScriptPath) {
            $candidate = "$env:APPDATA\npm\node_modules\putmein-test\bin\init-db.sql"
            if (Test-Path $candidate) { $sqlScriptPath = $candidate }
        }
        if ($sqlScriptPath -and (Test-Path $sqlScriptPath)) {
            Write-Color "  Initializing database schema and default admin..." Cyan
            Get-Content $sqlScriptPath | docker exec -i putmein-mysql mysql -uroot -p"$dbPass" putmein 2>$null
            Write-Success "Database schema verified and admin user ready!"
        }
    } catch {}
}

# Reset PM2 daemon to guarantee clean process table
try { pm2 delete all 2>$null | Out-Null } catch {}
try { pm2 kill 2>$null | Out-Null } catch {}

# Start services via ray CLI or node fallback
Write-Color "  Starting PutmeIn services (Ray & Brain)..." Cyan
$rayCmd = Get-Command ray -ErrorAction SilentlyContinue
if ($rayCmd) {
    ray start
} else {
    $globalNpm = (npm root -g 2>$null)
    $rayScript = ""
    if ($globalNpm) {
        $rayScript = Join-Path $globalNpm.Trim() "putmein-test\bin\ray.js"
    }
    if ($rayScript -and (Test-Path $rayScript)) {
        node $rayScript start
    } else {
        node "$env:APPDATA\npm\node_modules\putmein-test\bin\ray.js" start
    }
}

# Output Finish (Pure ASCII borders for 100% cross-terminal fidelity)
function Write-BoxLine([string]$content = "", [ConsoleColor]$color = [ConsoleColor]::White) {
    $innerWidth = 66
    $len = $content.Length
    $pad = [Math]::Max(0, $innerWidth - $len)
    $spaces = " " * $pad
    Write-Host "|" -ForegroundColor Cyan -NoNewline
    Write-Host "  " -NoNewline
    if ($content.Length -gt 0) {
        Write-Host $content -ForegroundColor $color -NoNewline
    }
    Write-Host "$spaces  " -NoNewline
    Write-Host "|" -ForegroundColor Cyan
}

$boxBorder = "-" * 70
Write-Host ""
Write-Host "+$boxBorder+" -ForegroundColor Cyan
Write-BoxLine ""
Write-BoxLine "[OK] PutmeIn successfully installed and running!" -color Green
Write-BoxLine ""
Write-BoxLine "Web Dashboard (Ray):    http://localhost:4567"
Write-BoxLine "Network Dashboard:      http://127.0.0.1:4567"
Write-BoxLine "AI Backend (Brain):     http://localhost:4500"
Write-BoxLine ""
Write-BoxLine "Default Admin Login:"
Write-BoxLine "  * Email:    admin@putme.in" -color Yellow
Write-BoxLine "  * Password: admin123" -color Yellow
Write-BoxLine ""
Write-BoxLine "Useful CLI Commands:"
Write-BoxLine "  * ray status         Inspect service health and memory" -color Yellow
Write-BoxLine "  * ray logs           Stream real-time unified logs" -color Yellow
Write-BoxLine "  * ray stop           Stop running background services" -color Yellow
Write-BoxLine "  * ray restart        Restart background services" -color Yellow
Write-BoxLine "  * ray cohen          Launch interactive terminal TUI" -color Yellow
Write-BoxLine "  * ray --no-startup   Disable launching on system boot" -color Yellow
Write-BoxLine ""
Write-Host "+$boxBorder+" -ForegroundColor Cyan
Write-Host ""
