# Prisma 7 + Supabase: clean legacy artifacts, generate client, run initial migration.
# Run from repo root. Requires .env with DATABASE_URL (pooled) and DIRECT_URL (port 5432).

$ErrorActionPreference = "Stop"

Write-Host "Cleaning legacy Prisma artifacts..." -ForegroundColor Cyan
if (Test-Path "node_modules\.prisma") {
  Remove-Item -Recurse -Force "node_modules\.prisma"
  Write-Host "  Removed node_modules\.prisma"
}
if (Test-Path "src\generated") {
  Remove-Item -Recurse -Force "src\generated"
  Write-Host "  Removed src\generated"
}

Write-Host "`nGenerating Prisma Client..." -ForegroundColor Cyan
npx prisma generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nRunning migrations (DIRECT_URL / port 5432)..." -ForegroundColor Cyan
npx prisma migrate dev --name init_supabase
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nDone." -ForegroundColor Green
