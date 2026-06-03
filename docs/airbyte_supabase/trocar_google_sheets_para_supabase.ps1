param(
  [string]$EnvPath = ".\airbyte-local.env"
)

if (-not (Test-Path -LiteralPath $EnvPath)) {
  Write-Error "Arquivo $EnvPath nao encontrado. Copie airbyte-local.env.example para airbyte-local.env e preencha os valores."
  exit 1
}

Get-Content -LiteralPath $EnvPath | ForEach-Object {
  if ($_ -match "^\s*#" -or $_ -notmatch "=") { return }
  $parts = $_ -split "=", 2
  [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
}

$required = @(
  "AIRBYTE_URL",
  "AIRBYTE_CLIENT_ID",
  "AIRBYTE_CLIENT_SECRET",
  "AIRBYTE_WORKSPACE_ID",
  "AIRBYTE_DESTINATION_ID",
  "SUPABASE_HOST",
  "SUPABASE_PORT",
  "SUPABASE_DATABASE",
  "SUPABASE_USERNAME",
  "SUPABASE_DB_PASSWORD",
  "SUPABASE_SCHEMA"
)

foreach ($name in $required) {
  if (-not [Environment]::GetEnvironmentVariable($name, "Process")) {
    Write-Error "Variavel obrigatoria ausente: $name"
    exit 1
  }
}

$tokenBody = @{
  client_id = $env:AIRBYTE_CLIENT_ID
  client_secret = $env:AIRBYTE_CLIENT_SECRET
} | ConvertTo-Json

$token = Invoke-RestMethod -Method Post -Uri "$env:AIRBYTE_URL/api/v1/applications/token" -ContentType "application/json" -Body $tokenBody
$headers = @{ Authorization = "Bearer $($token.access_token)" }

$sourcePayload = @{
  name = "Supabase Postgres - Versao Vegana"
  workspaceId = $env:AIRBYTE_WORKSPACE_ID
  sourceType = "postgres"
  configuration = @{
    host = $env:SUPABASE_HOST
    port = [int]$env:SUPABASE_PORT
    database = $env:SUPABASE_DATABASE
    username = $env:SUPABASE_USERNAME
    password = $env:SUPABASE_DB_PASSWORD
    schemas = @($env:SUPABASE_SCHEMA)
    ssl_mode = @{ mode = "require" }
    replication_method = @{ method = "Standard" }
    tunnel_method = @{ tunnel_method = "NO_TUNNEL" }
  }
} | ConvertTo-Json -Depth 10

Write-Host "Tentando criar origem Postgres no Airbyte..."
try {
  $source = Invoke-RestMethod -Method Post -Uri "$env:AIRBYTE_URL/api/public/v1/sources" -Headers $headers -ContentType "application/json" -Body $sourcePayload
  Write-Host "Origem criada: $($source.sourceId)"
  Write-Host "Agora crie/atualize a conexao para o destino BigQuery na interface, selecione as tabelas e rode uma sync manual."
} catch {
  Write-Host "Nao foi possivel criar automaticamente pela API publica deste Airbyte."
  Write-Host "Use os mesmos valores pela interface do Airbyte. Detalhe:"
  Write-Host $_.Exception.Message
  exit 1
}
