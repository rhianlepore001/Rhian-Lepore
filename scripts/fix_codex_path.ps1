# Script para Corrigir o PATH do npm e Codex CLI
# Execute este script no PowerShell como Administrador se o comando 'codex' não for reconhecido.

$npmPath = npm config get prefix
$binPath = Join-Path $npmPath "" # No Windows, o prefixo geralmente já é onde os .cmd ficam

if (Test-Path $binPath) {
    Write-Host "Localizado diretório do npm: $binPath" -ForegroundColor Green
    
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($currentPath -notlike "*$binPath*") {
        Write-Host "Adicionando $binPath ao PATH do Usuário..." -ForegroundColor Yellow
        $newPath = "$currentPath;$binPath"
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-Host "Sucesso! Por favor, abra um NOVO terminal para as mudanças fazerem efeito." -ForegroundColor Green
    } else {
        Write-Host "O caminho já está no PATH. Tente apenas fechar e abrir o terminal novamente." -ForegroundColor Cyan
    }
} else {
    Write-Host "Erro: Não foi possível localizar o diretório do npm." -ForegroundColor Red
}
