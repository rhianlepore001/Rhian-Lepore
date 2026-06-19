param(
    [string]$SqlFile,
    # Segredos vêm SEMPRE do ambiente — nunca hardcode no script (vai para o git).
    [string]$Token = $env:SUPABASE_ACCESS_TOKEN,
    [string]$ProjectRef = $env:SUPABASE_PROJECT_REF
)

if (-not $Token) {
    Write-Host "ERROR: defina a variavel de ambiente SUPABASE_ACCESS_TOKEN (PAT do Supabase) ou use -Token." -ForegroundColor Red
    exit 1
}
if (-not $ProjectRef) {
    Write-Host "ERROR: defina SUPABASE_PROJECT_REF ou use -ProjectRef." -ForegroundColor Red
    exit 1
}

$sql  = [System.IO.File]::ReadAllText($SqlFile, [System.Text.Encoding]::UTF8)
# Serializa só a string do SQL como JSON e envolve no objeto
$sqlJson = $sql | ConvertTo-Json -Compress
$body = "{`"query`": $sqlJson}"

try {
    $resp = Invoke-RestMethod `
        -Uri "https://api.supabase.com/v1/projects/$ProjectRef/database/query" `
        -Method Post `
        -Headers @{ Authorization = "Bearer $Token"; 'Content-Type' = 'application/json' } `
        -Body $body `
        -ErrorAction Stop

    Write-Host "SUCCESS:" -ForegroundColor Green
    $resp | ConvertTo-Json -Depth 5
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "DETAILS: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
