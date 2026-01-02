$componentsPath = "c:\Users\User\Downloads\Rhian-Lepore-main\components"
$pagesPath = "c:\Users\User\Downloads\Rhian-Lepore-main\pages"

Write-Host "🔍 Verificando arquivos TSX/TS para problemas de encoding..." -ForegroundColor Cyan

$problemFiles = @()

# Check all .tsx and .ts files
$allFiles = Get-ChildItem -Path $componentsPath, $pagesPath -Include *.tsx, *.ts -Recurse

foreach ($file in $allFiles) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    
    # Check for encoding issues (common corruption patterns)
    if ($content -match 'ðŸ|Ã[^a-zA-Z ]|â€|Ã§Ã£|Â') {
        $problemFiles += $file.FullName
        Write-Host "⚠️  Problema encontrado: $($file.Name)" -ForegroundColor Yellow
    }
}

if ($problemFiles.Count -eq 0) {
    Write-Host "✅ Nenhum problema de encoding encontrado!" -ForegroundColor Green
    Write-Host "✅ Todos os arquivos estão com UTF-8 correto" -ForegroundColor Green
}
else {
    Write-Host "`n❌ Arquivos com problemas:" -ForegroundColor Red
    foreach ($file in $problemFiles) {
        Write-Host "   - $file" -ForegroundColor Red
    }
}

Write-Host "`n📊 Total de arquivos verificados: $($allFiles.Count)" -ForegroundColor Cyan
