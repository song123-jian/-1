# install-tools.ps1
# 安装数据库和服务端软件到 d:\RJBC\env
# 用法：powershell -ExecutionPolicy Bypass -File .\scripts\install-tools.ps1

$ErrorActionPreference = "Stop"
$envRoot = "d:\RJBC\env"
$downloadDir = "$envRoot\downloads"

New-Item -ItemType Directory -Force -Path $downloadDir | Out-Null

function DownloadAndExtract {
    param([string]$Url, [string]$ZipFile, [string]$DestDir, [string]$Name, [string]$SubDir)
    if (Test-Path $DestDir) {
        Write-Host "[跳过] $Name 已安装" -ForegroundColor Yellow
        return
    }
    Write-Host "[下载] $Name ..." -ForegroundColor Cyan
    $wc = New-Object System.Net.WebClient
    $wc.DownloadFile($Url, $ZipFile)
    $wc.Dispose()
    $size = [math]::Round((Get-Item $ZipFile).Length / 1MB, 1)
    Write-Host "[完成] $Name 下载: $size MB" -ForegroundColor Green
    # 解压
    Write-Host "[解压] $Name ..." -ForegroundColor Cyan
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $tempDir = "$DestDir-temp"
    [System.IO.Compression.ZipFile]::ExtractToDirectory($ZipFile, $tempDir)
    # 如果有子目录，移动内容
    if ($SubDir) {
        $subPath = Join-Path $tempDir $SubDir
        if (Test-Path $subPath) {
            Move-Item $subPath $DestDir -Force
        } else {
            Move-Item $tempDir $DestDir -Force
        }
    } else {
        Move-Item $tempDir $DestDir -Force
    }
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "[完成] $Name 安装完成" -ForegroundColor Green
}

# ============================================================
# 1. SQLite
# ============================================================
Write-Host "`n========== [1/7] SQLite ==========" -ForegroundColor Magenta
DownloadAndExtract `
    -Url "https://www.sqlite.org/2024/sqlite-tools-win32-3460000.zip" `
    -ZipFile "$downloadDir\sqlite.zip" `
    -DestDir "$envRoot\sqlite" `
    -Name "SQLite"

# ============================================================
# 2. Redis (Windows 版)
# ============================================================
Write-Host "`n========== [2/7] Redis ==========" -ForegroundColor Magenta
DownloadAndExtract `
    -Url "https://github.com/tporadowski/redis/releases/download/v5.0.14.1/Redis-x64-5.0.14.1.zip" `
    -ZipFile "$downloadDir\redis.zip" `
    -DestDir "$envRoot\redis" `
    -Name "Redis"

# ============================================================
# 3. Nginx
# ============================================================
Write-Host "`n========== [3/7] Nginx ==========" -ForegroundColor Magenta
DownloadAndExtract `
    -Url "http://nginx.org/download/nginx-1.27.0.zip" `
    -ZipFile "$downloadDir\nginx.zip" `
    -DestDir "$envRoot\nginx" `
    -Name "Nginx" `
    -SubDir "nginx-1.27.0"

# ============================================================
# 4. Maven
# ============================================================
Write-Host "`n========== [4/7] Maven ==========" -ForegroundColor Magenta
DownloadAndExtract `
    -Url "https://dlcdn.apache.org/maven/maven-3/3.9.8/binaries/apache-maven-3.9.8-bin.zip" `
    -ZipFile "$downloadDir\maven.zip" `
    -DestDir "$envRoot\maven" `
    -Name "Maven" `
    -SubDir "apache-maven-3.9.8"

# ============================================================
# 5. Gradle
# ============================================================
Write-Host "`n========== [5/7] Gradle ==========" -ForegroundColor Magenta
DownloadAndExtract `
    -Url "https://services.gradle.org/distributions/gradle-8.8-bin.zip" `
    -ZipFile "$downloadDir\gradle.zip" `
    -DestDir "$envRoot\gradle" `
    -Name "Gradle" `
    -SubDir "gradle-8.8"

# ============================================================
# 6. MongoDB
# ============================================================
Write-Host "`n========== [6/7] MongoDB ==========" -ForegroundColor Magenta
DownloadAndExtract `
    -Url "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.12.zip" `
    -ZipFile "$downloadDir\mongodb.zip" `
    -DestDir "$envRoot\mongodb" `
    -Name "MongoDB" `
    -SubDir "mongodb-win32-x86_64-windows-7.0.12"
# 创建数据目录
New-Item -ItemType Directory -Force -Path "$envRoot\mongodb\data" | Out-Null
New-Item -ItemType Directory -Force -Path "$envRoot\mongodb\log" | Out-Null

# ============================================================
# 7. MySQL
# ============================================================
Write-Host "`n========== [7/7] MySQL ==========" -ForegroundColor Magenta
DownloadAndExtract `
    -Url "https://dev.mysql.com/get/Downloads/MySQL-8.0/mysql-8.0.40-winx64.zip" `
    -ZipFile "$downloadDir\mysql.zip" `
    -DestDir "$envRoot\mysql" `
    -Name "MySQL" `
    -SubDir "mysql-8.0.40-winx64"
# 创建数据目录
New-Item -ItemType Directory -Force -Path "$envRoot\mysql\data" | Out-Null

# ============================================================
# 验证安装
# ============================================================
Write-Host "`n========== 安装验证 ==========" -ForegroundColor Magenta
$checks = @(
    @{Name="SQLite"; Path="$envRoot\sqlite\sqlite3.exe"},
    @{Name="Redis"; Path="$envRoot\redis\redis-server.exe"},
    @{Name="Nginx"; Path="$envRoot\nginx\nginx.exe"},
    @{Name="Maven"; Path="$envRoot\maven\bin\mvn.cmd"},
    @{Name="Gradle"; Path="$envRoot\gradle\bin\gradle.bat"},
    @{Name="MongoDB"; Path="$envRoot\mongodb\bin\mongod.exe"},
    @{Name="MySQL"; Path="$envRoot\mysql\bin\mysqld.exe"}
)
foreach ($c in $checks) {
    if (Test-Path $c.Path) {
        Write-Host "[OK] $($c.Name)" -ForegroundColor Green
    } else {
        Write-Host "[缺失] $($c.Name)" -ForegroundColor Red
    }
}
Write-Host "`n========== 安装完成 ==========" -ForegroundColor Green
Write-Host "Docker Desktop 需要系统级安装，请单独下载: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
