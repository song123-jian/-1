# build-exe.ps1
# 打包 Windows EXE（Go 后端 + Flutter Windows 前端）
# 用法：. .\set-env.ps1; .\scripts\build-exe.ps1

$ErrorActionPreference = "Stop"
$projectRoot = "d:\RJBC"
$buildDir = "$projectRoot\build\exe"

New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

Write-Host "===== [1/2] 构建 Go 后端 EXE =====" -ForegroundColor Magenta
Push-Location "$projectRoot\backend"
# 交叉编译为 Windows EXE，隐藏控制台窗口（-ldflags "-H windowsgui" 可选，单机服务建议保留控制台）
$env:CGO_ENABLED = "0"
go build -ldflags "-s -w" -o "$buildDir\backend.exe" .
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] Go 后端构建失败" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "[完成] backend.exe -> $buildDir\backend.exe" -ForegroundColor Green
Pop-Location

Write-Host "`n===== [2/2] 构建 Flutter Windows EXE =====" -ForegroundColor Magenta
Push-Location "$projectRoot\frontend"
flutter build windows --release
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] Flutter Windows 构建失败" -ForegroundColor Red
    Pop-Location
    exit 1
}
# 复制 Flutter 产物到 build\exe
$flutterExeDir = "$projectRoot\frontend\build\windows\x64\runner\Release"
if (Test-Path $flutterExeDir) {
    # 将整个 Release 目录复制为 app 子目录
    $appDir = "$buildDir\app"
    if (Test-Path $appDir) { Remove-Item $appDir -Recurse -Force }
    Copy-Item $flutterExeDir $appDir -Recurse
    Write-Host "[完成] Flutter EXE -> $appDir" -ForegroundColor Green
} else {
    Write-Host "[警告] 未找到 Flutter 构建产物" -ForegroundColor Yellow
}
Pop-Location

Write-Host "`n===== EXE 打包完成 =====" -ForegroundColor Green
Write-Host "产物目录: $buildDir" -ForegroundColor Cyan
Write-Host "  - backend.exe   (Go 后端服务)" -ForegroundColor Cyan
Write-Host "  - app\          (Flutter Windows 应用)" -ForegroundColor Cyan
Write-Host "`n运行方式: 先启动 backend.exe，再运行 app\frontend.exe" -ForegroundColor Yellow
