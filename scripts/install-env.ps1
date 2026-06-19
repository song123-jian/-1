# install-env.ps1
# RJBC 项目环境一键安装脚本
# 所有工具安装到 d:\RJBC\env 目录内
# 用法：powershell -ExecutionPolicy Bypass -File .\scripts\install-env.ps1

$ErrorActionPreference = "Stop"
$envRoot = "d:\RJBC\env"
$downloadDir = "$envRoot\downloads"

# 创建目录
New-Item -ItemType Directory -Force -Path $envRoot, $downloadDir | Out-Null

# 工具函数：下载并解压
function Download-File {
    param([string]$Url, [string]$OutFile, [string]$Name)
    if (Test-Path $OutFile) {
        Write-Host "[跳过] $Name 已下载: $OutFile" -ForegroundColor Yellow
        return
    }
    Write-Host "[下载] $Name ..." -ForegroundColor Cyan
    Write-Host "       URL: $Url"
    # 使用 BITS 或 Invoke-WebRequest
    try {
        Import-Module BitsTransfer -ErrorAction Stop
        Start-BitsTransfer -Source $Url -Destination $OutFile -DisplayName "下载 $Name"
    } catch {
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing
    }
    Write-Host "[完成] $Name 下载完成" -ForegroundColor Green
}

function Expand-Zip {
    param([string]$ZipFile, [string]$DestDir, [string]$Name)
    Write-Host "[解压] $Name ..." -ForegroundColor Cyan
    Expand-Archive -Path $ZipFile -DestinationPath $DestDir -Force
    Write-Host "[完成] $Name 解压完成" -ForegroundColor Green
}

# ============================================================
# 1. 安装 Go
# ============================================================
Write-Host "`n========== [1/5] 安装 Go ==========" -ForegroundColor Magenta
$goVersion = "1.22.5"
$goUrl = "https://golang.google.cn/dl/go$goVersion.windows-amd64.zip"
$goZip = "$downloadDir\go.zip"
if (-not (Test-Path "$envRoot\go\bin\go.exe")) {
    Download-File -Url $goUrl -OutFile $goZip -Name "Go $goVersion"
    Expand-Zip -ZipFile $goZip -DestDir $envRoot -Name "Go"
} else {
    Write-Host "[跳过] Go 已安装" -ForegroundColor Yellow
}

# ============================================================
# 2. 安装 Git 便携版
# ============================================================
Write-Host "`n========== [2/5] 安装 Git ==========" -ForegroundColor Magenta
$gitVersion = "2.54.0"
$gitUrl = "https://registry.npmmirror.com/-/binary/git-for-windows/v$gitVersion.windows.1/PortableGit-$gitVersion-64-bit.7z.exe"
$gitExe = "$downloadDir\git.7z.exe"
if (-not (Test-Path "$envRoot\git\cmd\git.exe")) {
    Download-File -Url $gitUrl -OutFile $gitExe -Name "Git $gitVersion"
    # PortableGit 是自解压 7z，用 7z 解压
    Write-Host "[解压] Git ..." -ForegroundColor Cyan
    $tempGit = "$envRoot\git-temp"
    New-Item -ItemType Directory -Force -Path $tempGit | Out-Null
    # 自解压
    Start-Process -FilePath $gitExe -ArgumentList "-y -o`"$tempGit`"" -Wait -NoNewWindow
    if (Test-Path "$tempGit\cmd\git.exe") {
        Move-Item $tempGit "$envRoot\git" -Force
    } else {
        # 备用：直接解压 7z
        Expand-Archive -Path $gitExe -DestinationPath "$envRoot\git" -Force -ErrorAction SilentlyContinue
    }
    Write-Host "[完成] Git 安装完成" -ForegroundColor Green
} else {
    Write-Host "[跳过] Git 已安装" -ForegroundColor Yellow
}

# ============================================================
# 3. 安装 OpenJDK 17
# ============================================================
Write-Host "`n========== [3/5] 安装 OpenJDK 17 ==========" -ForegroundColor Magenta
$jdkUrl = "https://download.java.net/java/GA/jdk17.0.2/dfd4a8d0985749f896bed50d7138ee7f/8/GPL/openjdk-17.0.2_windows-x64_bin.zip"
$jdkZip = "$downloadDir\jdk.zip"
if (-not (Test-Path "$envRoot\jdk\bin\java.exe")) {
    Download-File -Url $jdkUrl -OutFile $jdkZip -Name "OpenJDK 17"
    # 解压到临时目录再重命名
    $tempJdk = "$envRoot\jdk-temp"
    Expand-Zip -ZipFile $jdkZip -DestDir $tempJdk -Name "OpenJDK 17"
    # 找到解压后的 jdk-17 目录
    $jdkDir = Get-ChildItem $tempJdk -Directory | Where-Object { $_.Name -like "jdk-17*" } | Select-Object -First 1
    if ($jdkDir) {
        Move-Item $jdkDir.FullName "$envRoot\jdk" -Force
    }
    Remove-Item $tempJdk -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "[完成] OpenJDK 17 安装完成" -ForegroundColor Green
} else {
    Write-Host "[跳过] OpenJDK 17 已安装" -ForegroundColor Yellow
}

# ============================================================
# 4. 安装 Flutter
# ============================================================
Write-Host "`n========== [4/5] 安装 Flutter ==========" -ForegroundColor Magenta
$flutterVersion = "3.22.2"
$flutterUrl = "https://storage.flutter-io.cn/flutter_infra_release/releases/stable/windows/flutter_windows_$flutterVersion-stable.zip"
$flutterZip = "$downloadDir\flutter.zip"
if (-not (Test-Path "$envRoot\flutter\bin\flutter.bat")) {
    Download-File -Url $flutterUrl -OutFile $flutterZip -Name "Flutter $flutterVersion"
    Expand-Zip -ZipFile $flutterZip -DestDir $envRoot -Name "Flutter"
    Write-Host "[完成] Flutter 安装完成" -ForegroundColor Green
} else {
    Write-Host "[跳过] Flutter 已安装" -ForegroundColor Yellow
}

# ============================================================
# 5. 安装 Android SDK
# ============================================================
Write-Host "`n========== [5/5] 安装 Android SDK ==========" -ForegroundColor Magenta
$cmdlineUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
$cmdlineZip = "$downloadDir\cmdline-tools.zip"
if (-not (Test-Path "$envRoot\android-sdk\cmdline-tools\latest\bin\sdkmanager.bat")) {
    Download-File -Url $cmdlineUrl -OutFile $cmdlineZip -Name "Android Command Line Tools"
    # 解压
    $tempSdk = "$envRoot\android-sdk\cmdline-tools-tmp"
    Expand-Zip -ZipFile $cmdlineZip -DestDir $tempSdk -Name "Android Command Line Tools"
    # 规范目录结构：cmdline-tools/latest/
    New-Item -ItemType Directory -Force -Path "$envRoot\android-sdk\cmdline-tools\latest" | Out-Null
    $extractedDir = Get-ChildItem $tempSdk -Directory | Select-Object -First 1
    if ($extractedDir) {
        Get-ChildItem $extractedDir.FullName | Move-Item -Destination "$envRoot\android-sdk\cmdline-tools\latest" -Force
    }
    Remove-Item $tempSdk -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "[完成] Android Command Line Tools 安装完成" -ForegroundColor Green
} else {
    Write-Host "[跳过] Android Command Line Tools 已安装" -ForegroundColor Yellow
}

# ============================================================
# 配置环境变量并安装 Android SDK 组件
# ============================================================
Write-Host "`n========== 配置环境并安装 Android SDK 组件 ==========" -ForegroundColor Magenta

# 设置环境变量（当前会话）
$env:GOROOT = "$envRoot\go"
$env:GOPATH = "$envRoot\gopath"
$env:JAVA_HOME = "$envRoot\jdk"
$env:ANDROID_HOME = "$envRoot\android-sdk"
$env:ANDROID_SDK_ROOT = "$envRoot\android-sdk"
$env:PATH = "$envRoot\go\bin;$envRoot\flutter\bin;$envRoot\git\cmd;$envRoot\jdk\bin;$envRoot\android-sdk\platform-tools;$envRoot\android-sdk\cmdline-tools\latest\bin;$env:PATH"
$env:GOPROXY = "https://goproxy.cn,direct"
$env:FLUTTER_STORAGE_BASE_URL = "https://storage.flutter-io.cn"
$env:PUB_HOSTED_URL = "https://pub.flutter-io.cn"

# 安装 Android SDK 组件
$sdkmanager = "$envRoot\android-sdk\cmdline-tools\latest\bin\sdkmanager.bat"
if (Test-Path $sdkmanager) {
    Write-Host "[安装] Android SDK 组件（platform-tools, build-tools, platform 34）..." -ForegroundColor Cyan
    # 接受许可
    "y`n" | & $sdkmanager --licenses 2>&1 | Out-Null
    & $sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" 2>&1 | Out-Null
    Write-Host "[完成] Android SDK 组件安装完成" -ForegroundColor Green
}

# ============================================================
# 验证安装
# ============================================================
Write-Host "`n========== 安装验证 ==========" -ForegroundColor Magenta

$checks = @(
    @{ Name = "Go"; Path = "$envRoot\go\bin\go.exe"; Cmd = "go version" },
    @{ Name = "Git"; Path = "$envRoot\git\cmd\git.exe"; Cmd = "git --version" },
    @{ Name = "JDK"; Path = "$envRoot\jdk\bin\java.exe"; Cmd = "java -version" },
    @{ Name = "Flutter"; Path = "$envRoot\flutter\bin\flutter.bat"; Cmd = "flutter --version" },
    @{ Name = "Android SDK"; Path = "$envRoot\android-sdk\cmdline-tools\latest\bin\sdkmanager.bat"; Cmd = $null }
)

foreach ($check in $checks) {
    if (Test-Path $check.Path) {
        Write-Host "[OK] $($check.Name)" -ForegroundColor Green
    } else {
        Write-Host "[缺失] $($check.Name)" -ForegroundColor Red
    }
}

Write-Host "`n========== 安装完成 ==========" -ForegroundColor Green
Write-Host "请运行: . .\set-env.ps1  来配置环境变量" -ForegroundColor Yellow
Write-Host "注意: Flutter Windows 构建还需要 Visual Studio Build Tools 2022（含 C++ 桌面开发工作负载）" -ForegroundColor Yellow
$vsUrl = 'https://visualstudio.microsoft.com/zh-hans/visual-cpp-build-tools/'
Write-Host ("      下载地址: {0}" -f $vsUrl) -ForegroundColor Yellow
