# ConversionOps — Local dev setup
# Run from repo root

Write-Host "Setting up ConversionOps dev environment..." -ForegroundColor Cyan

# Check prerequisites
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js 20+ required. Install from https://nodejs.org"
    exit 1
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker required for local Postgres + Redis. Install Docker Desktop."
    exit 1
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pnpm install

# Copy env
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example — fill in your secrets" -ForegroundColor Yellow
}

# Start Docker services
Write-Host "Starting Postgres + Redis..." -ForegroundColor Yellow
docker compose -f infra/docker/docker-compose.yml up -d

Start-Sleep -Seconds 3

# Run migrations
Write-Host "Running database migrations..." -ForegroundColor Yellow
pnpm run db:generate
pnpm run db:migrate

# Seed
Write-Host "Seeding database..." -ForegroundColor Yellow
pnpm run db:seed

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "  API:    http://localhost:3001" -ForegroundColor Cyan
Write-Host "  App:    http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Web:    http://localhost:3002" -ForegroundColor Cyan
Write-Host "  Admin:  http://localhost:3003" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run 'pnpm dev' to start all services." -ForegroundColor White
