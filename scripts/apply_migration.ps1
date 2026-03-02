param(
    [string]$SqlFile,
    [string]$Token = 'sbp_02d0fa71fc41fd65ed9363e4175c05888e4c6963',
    [string]$ProjectRef = 'lcqwrngscsziysyfhpfj'
)

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
