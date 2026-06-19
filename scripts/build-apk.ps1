# build-apk.ps1
# 打包 Android APK（Flutter Android）
# 用法：. .\set-env.ps1; .\scripts\build-apk.ps1

$ErrorActionPreference = "Stop"
$projectRoot = "d:\RJBC"
$buildDir = "$projectRoot\build\apk"

New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

Write-Host "===== 构建 Flutter Android APK =====" -ForegroundColor Magenta
Push-Location "$projectRoot\frontend"
flutter build apk --release
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] Flutter APK 构建失败" -ForegroundColor Red
    Pop-Location
    exit 1
}

# 复制产物
$apkPath = "$projectRoot\frontend\build\app\outputs\flutter-apk\app-release.apk"
if (Test-Path $apkPath) {
    Copy-Item $apkPath "$buildDir\app-release.apk" -Force
    Write-Host "[完成] APK -> $buildDir\app-release.apk" -ForegroundColor Green
} else {
    Write-Host "[错误] 未找到构建产物: $apkPath" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

Write-Host "`n===== APK 打包完成 =====" -ForegroundColor Green
Write-Host "产物: $buildDir\app-release.apk" -ForegroundColor Cyan
