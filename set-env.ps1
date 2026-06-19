﻿# set-env.ps1
# RJBC 项目环境变量配置脚本
# 每次开发前运行：. .\set-env.ps1

$envRoot = "d:\RJBC\env"

# Go
$env:GOROOT = "$envRoot\go"
$env:GOPATH = "$envRoot\gopath"
$env:GOBIN = "$envRoot\go\bin"
$env:GOMODCACHE = "$envRoot\gopath\pkg\mod"
$env:PATH = "$envRoot\go\bin;$envRoot\gopath\bin;$env:PATH"

# Flutter
$env:PATH = "$envRoot\flutter\bin;$env:PATH"

# Git
$env:PATH = "$envRoot\git\cmd;$env:PATH"

# JDK (Android 构建用)
$env:JAVA_HOME = "$envRoot\jdk"
$env:PATH = "$envRoot\jdk\bin;$env:PATH"

# Android SDK
$env:ANDROID_HOME = "$envRoot\android-sdk"
$env:ANDROID_SDK_ROOT = "$envRoot\android-sdk"
$env:PATH = "$envRoot\android-sdk\platform-tools;$envRoot\android-sdk\cmdline-tools\latest\bin;$env:PATH"

# Node.js + npm 全局包
$env:PATH = "$envRoot\node;$envRoot\node\npm-global;$env:PATH"

# Python
$env:PATH = "$envRoot\python;$envRoot\python\Scripts;$env:PATH"

# CMake
$env:PATH = "$envRoot\cmake\bin;$env:PATH"

# Rust
$env:RUSTUP_HOME = "$envRoot\rust\rustup"
$env:CARGO_HOME = "$envRoot\rust\cargo"
$env:RUSTUP_DIST_SERVER = "https://mirrors.tuna.tsinghua.edu.cn/rustup"
$env:RUSTUP_UPDATE_ROOT = "https://mirrors.tuna.tsinghua.edu.cn/rustup/rustup"
$env:PATH = "$envRoot\rust\cargo\bin;$env:PATH"

# JDK 21
$env:JAVA_HOME_21 = "$envRoot\jdk21"
$env:PATH = "$envRoot\jdk21\bin;$env:PATH"

# 数据库
$env:PATH = "$envRoot\sqlite;$envRoot\redis;$envRoot\mongodb\bin;$envRoot\mysql\bin;$env:PATH"

# 服务端软件
$env:NGINX_HOME = "$envRoot\nginx"
$env:GRADLE_HOME = "$envRoot\gradle"
$env:GRADLE_USER_HOME = "$envRoot\.gradle"
$env:MAVEN_HOME = "$envRoot\maven"
$env:PATH = "$envRoot\nginx;$envRoot\gradle\bin;$envRoot\maven\bin;$env:PATH"

# 国内镜像加速
$env:GOPROXY = "https://goproxy.cn,direct"
$env:FLUTTER_STORAGE_BASE_URL = "https://storage.flutter-io.cn"
$env:PUB_HOSTED_URL = "https://pub.flutter-io.cn"

Write-Host "===== RJBC 环境变量已配置 =====" -ForegroundColor Green
Write-Host "GOROOT        : $env:GOROOT"
Write-Host "GOPATH        : $env:GOPATH"
Write-Host "GOMODCACHE    : $env:GOMODCACHE"
Write-Host "JAVA_HOME     : $env:JAVA_HOME (JDK 17)"
Write-Host "JAVA_HOME_21  : $env:JAVA_HOME_21"
Write-Host "ANDROID_HOME  : $env:ANDROID_HOME"
Write-Host "GRADLE_USER_HOME: $env:GRADLE_USER_HOME"
Write-Host "RUSTUP_HOME   : $env:RUSTUP_HOME"
Write-Host "CARGO_HOME    : $env:CARGO_HOME"
Write-Host "GOPROXY       : $env:GOPROXY"
Write-Host "===============================" -ForegroundColor Green

# 验证
if (Test-Path "$envRoot\go\bin\go.exe") {
    Write-Host "[OK] Go: $(& "$envRoot\go\bin\go.exe" version)" -ForegroundColor Cyan
} else {
    Write-Host "[未安装] Go - 请运行 scripts\install-env.ps1" -ForegroundColor Yellow
}
if (Test-Path "$envRoot\flutter\bin\flutter.bat") {
    Write-Host "[OK] Flutter 已就绪" -ForegroundColor Cyan
} else {
    Write-Host "[未安装] Flutter - 请运行 scripts\install-env.ps1" -ForegroundColor Yellow
}
if (Test-Path "$envRoot\git\cmd\git.exe") {
    Write-Host "[OK] Git: $(& "$envRoot\git\cmd\git.exe" --version)" -ForegroundColor Cyan
} else {
    Write-Host "[未安装] Git - 请运行 scripts\install-env.ps1" -ForegroundColor Yellow
}
if (Test-Path "$envRoot\node\node.exe") {
    Write-Host "[OK] Node.js: $(& "$envRoot\node\node.exe" --version)" -ForegroundColor Cyan
} else {
    Write-Host "[未安装] Node.js - 请运行 scripts\install-languages.ps1" -ForegroundColor Yellow
}
if (Test-Path "$envRoot\python\python.exe") {
    Write-Host "[OK] Python: $(& "$envRoot\python\python.exe" --version)" -ForegroundColor Cyan
} else {
    Write-Host "[未安装] Python - 请运行 scripts\install-languages.ps1" -ForegroundColor Yellow
}
if (Test-Path "$envRoot\cmake\bin\cmake.exe") {
    Write-Host "[OK] CMake 已就绪" -ForegroundColor Cyan
} else {
    Write-Host "[未安装] CMake - 请运行 scripts\install-languages.ps1" -ForegroundColor Yellow
}
if (Test-Path "$envRoot\rust\cargo\bin\cargo.exe") {
    Write-Host "[OK] Rust (cargo) 已就绪" -ForegroundColor Cyan
} else {
    Write-Host "[未安装] Rust - 请运行 scripts\install-languages.ps1" -ForegroundColor Yellow
}
if (Test-Path "$envRoot\jdk21\bin\java.exe") {
    Write-Host "[OK] JDK 21 已就绪" -ForegroundColor Cyan
} else {
    Write-Host "[未安装] JDK 21 - 请运行 scripts\install-languages.ps1" -ForegroundColor Yellow
}
if (Test-Path "$envRoot\node\npm-global\yarn.cmd") {
    Write-Host "[OK] yarn 已就绪" -ForegroundColor Cyan
}
if (Test-Path "$envRoot\node\npm-global\tsc.cmd") {
    Write-Host "[OK] TypeScript 已就绪" -ForegroundColor Cyan
}
if (Test-Path "$envRoot\node\npm-global\vite.cmd") {
    Write-Host "[OK] Vite 已就绪" -ForegroundColor Cyan
}
if (Test-Path "$envRoot\sqlite\sqlite3.exe") {
    Write-Host "[OK] SQLite 已就绪" -ForegroundColor Cyan
}
if (Test-Path "$envRoot\redis\redis-server.exe") {
    Write-Host "[OK] Redis 已就绪" -ForegroundColor Cyan
}
if (Test-Path "$envRoot\mongodb\bin\mongod.exe") {
    Write-Host "[OK] MongoDB 已就绪" -ForegroundColor Cyan
}
if (Test-Path "$envRoot\mysql\bin\mysqld.exe") {
    Write-Host "[OK] MySQL 已就绪" -ForegroundColor Cyan
}
if (Test-Path "$envRoot\nginx\nginx.exe") {
    Write-Host "[OK] Nginx 已就绪" -ForegroundColor Cyan
}
if (Test-Path "$envRoot\gradle\bin\gradle.bat") {
    Write-Host "[OK] Gradle 已就绪" -ForegroundColor Cyan
}
if (Test-Path "$envRoot\maven\bin\mvn.cmd") {
    Write-Host "[OK] Maven 已就绪" -ForegroundColor Cyan
}
