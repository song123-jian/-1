# build-all.ps1
# 一键全量构建（EXE + APK）
# 用法：. .\set-env.ps1; .\scripts\build-all.ps1

$ErrorActionPreference = "Stop"
$projectRoot = "d:\RJBC"

Write-Host "========================================" -ForegroundColor Magenta
Write-Host "       RJBC 全量构建（EXE + APK）" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

# 1. 构建 EXE
Write-Host "`n>>> [1/2] 构建 Windows EXE <<<" -ForegroundColor Cyan
& "$projectRoot\scripts\build-exe.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] EXE 构建失败，终止" -ForegroundColor Red
    exit 1
}

# 2. 构建 APK
Write-Host "`n>>> [2/2] 构建 Android APK <<<" -ForegroundColor Cyan
& "$projectRoot\scripts\build-apk.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] APK 构建失败" -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "       全量构建完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "产物:" -ForegroundColor Cyan
Write-Host "  EXE: d:\RJBC\build\exe\" -ForegroundColor Cyan
Write-Host "  APK: d:\RJBC\build\apk\app-release.apk" -ForegroundColor Cyan
