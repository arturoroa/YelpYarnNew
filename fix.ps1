# Guardar este código como fix-imports.ps1 y ejecutar en PowerShell
$files = Get-ChildItem -Path "backend" -Recurse -Filter "*.ts"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $newContent = $content -replace '../database/DatabaseManager\.js', '../utils/DatabaseManager.js'
    Set-Content -Path $file.FullName -Value $newContent
}