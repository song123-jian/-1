# install-languages.ps1
# 补充安装：Node.js, Python, CMake, Rust, JDK 21
# 所有工具安装到 d:\RJBC\env 目录内
# 用法：powershell -ExecutionPolicy Bypass -File .\scripts\install-languages.ps1

$ErrorActionPreference = "Stop"
$envRoot = "d:\RJBC\env"
$downloadDir = "$envRoot\downloads"

New-Item -ItemType Directory -Force -Path $envRoot, $downloadDir | Out-Null

function Download-File {
    param([string]$Url, [string]$OutFile, [string]$Name)
    if (Test-Path $OutFile) {
        Write-Host "[跳过] $Name 已下载" -ForegroundColor Yellow
        return
    }
    Write-Host "[下载] $Name ..." -ForegroundColor Cyan
    $ProgressPreference = 'SilentlyContinue'
    try {
        Import-Module BitsTransfer -ErrorAction Stop
        Start-BitsTransfer -Source $Url -Destination $OutFile -DisplayName "下载 $Name"
    } catch {
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
# 1. 安装 Node.js 20
# ============================================================
Write-Host "`n========== [1/5] 安装 Node.js 20 ==========" -ForegroundColor Magenta
$nodeUrl = "https://registry.npmmirror.com/-/binary/node/v20.15.0/node-v20.15.0-win-x64.zip"
$nodeZip = "$downloadDir\node.zip"
if (-not (Test-Path "$envRoot\node\node.exe")) {
    Download-File -Url $nodeUrl -OutFile $nodeZip -Name "Node.js 20"
    $tempNode = "$envRoot\node-temp"
    Expand-Zip -ZipFile $nodeZip -DestDir $tempNode -Name "Node.js"
    $nodeDir = Get-ChildItem $tempNode -Directory | Select-Object -First 1
    if ($nodeDir) { Move-Item $nodeDir.FullName "$envRoot\node" -Force }
    Remove-Item $tempNode -Recurse -Force -ErrorAction SilentlyContinue
    # 配置 npm 国内镜像
    & "$envRoot\node\npm.cmd" config set registry https://registry.npmmirror.com
    Write-Host "[完成] Node.js 安装完成" -ForegroundColor Green
} else {
    Write-Host "[跳过] Node.js 已安装" -ForegroundColor Yellow
}

# ============================================================
# 2. 安装 Python 3.12
# ============================================================
Write-Host "`n========== [2/5] 安装 Python 3.12 ==========" -ForegroundColor Magenta
$pythonUrl = "https://www.python.org/ftp/python/3.12.4/python-3.12.4-embed-amd64.zip"
$pythonZip = "$downloadDir\python.zip"
if (-not (Test-Path "$envRoot\python\python.exe")) {
    Download-File -Url $pythonUrl -OutFile $pythonZip -Name "Python 3.12"
    Expand-Zip -ZipFile $pythonZip -DestDir "$envRoot\python" -Name "Python"
    # 添加 pip
    $getPipUrl = "https://bootstrap.pypa.io/get-pip.py"
    $getPipFile = "$envRoot\python\get-pip.py"
    Download-File -Url $getPipUrl -OutFile $getPipFile -Name "get-pip.py"
    # 修改 pth 文件启用 site-packages
    $pthFile = Get-ChildItem "$envRoot\python" -Filter "python*._pth" | Select-Object -First 1
    if ($pthFile) {
        Add-Content $pthFile.FullName "import site"
    }
    # 安装 pip
    & "$envRoot\python\python.exe" "$getPipFile" 2>&1 | Out-Null
    # 配置国内镜像
    $pipConfig = "$env:APPDATA\pip\pip.ini"
    New-Item -ItemType Directory -Force -Path (Split-Path $pipConfig) | Out-Null
    Set-Content $pipConfig "[global]`nindex-url = https://pypi.tuna.tsinghua.edu.cn/simple`ntrusted-host = pypi.tuna.tsinghua.edu.cn"
    Write-Host "[完成] Python 3.12 安装完成" -ForegroundColor Green
} else {
    Write-Host "[跳过] Python 已安装" -ForegroundColor Yellow
}

# ============================================================
# 3. 安装 CMake 3.30
# ============================================================
Write-Host "`n========== [3/5] 安装 CMake 3.30 ==========" -ForegroundColor Magenta
$cmakeUrl = "https://cmake.org/files/v3.30/cmake-3.30.0-windows-x86_64.zip"
$cmakeZip = "$downloadDir\cmake.zip"
if (-not (Test-Path "$envRoot\cmake\bin\cmake.exe")) {
    Download-File -Url $cmakeUrl -OutFile $cmakeZip -Name "CMake 3.30"
    $tempCmake = "$envRoot\cmake-temp"
    Expand-Zip -ZipFile $cmakeZip -DestDir $tempCmake -Name "CMake"
    $cmakeDir = Get-ChildItem $tempCmake -Directory | Select-Object -First 1
    if ($cmakeDir) { Move-Item $cmakeDir.FullName "$envRoot\cmake" -Force }
    Remove-Item $tempCmake -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "[完成] CMake 安装完成" -ForegroundColor Green
} else {
    Write-Host "[跳过] CMake 已安装" -ForegroundColor Yellow
}

# ============================================================
# 4. 安装 Rust
# ============================================================
Write-Host "`n========== [4/5] 安装 Rust ==========" -ForegroundColor Magenta
$rustupUrl = "https://win.rustup.rs/x86_64"
$rustupExe = "$downloadDir\rustup-init.exe"
if (-not (Test-Path "$envRoot\rust\bin\cargo.exe")) {
    Download-File -Url $rustupUrl -OutFile $rustupExe -Name "Rustup"
    # 设置 Rust 安装路径
    $env:RUSTUP_HOME = "$envRoot\rust\rustup"
    $env:CARGO_HOME = "$envRoot\rust\cargo"
    New-Item -ItemType Directory -Force -Path $env:RUSTUP_HOME, $env:CARGO_HOME | Out-Null
    # 静默安装
    & $rustupExe -y --default-toolchain stable --no-modify-path 2>&1 | Out-Host
    # 将 cargo bin 复制到统一位置
    if (Test-Path "$env:CARGO_HOME\bin") {
        if (-not (Test-Path "$envRoot\rust\bin")) {
            New-Item -ItemType Junction -Path "$envRoot\rust\bin" -Target "$env:CARGO_HOME\bin" | Out-Null
        }
    }
    Write-Host "[完成] Rust 安装完成" -ForegroundColor Green
} else {
    Write-Host "[跳过] Rust 已安装" -ForegroundColor Yellow
}

# ============================================================
# 5. 安装 JDK 21
# ============================================================
Write-Host "`n========== [5/5] 安装 JDK 21 ==========" -ForegroundColor Magenta
$jdk21Url = "https://aka.ms/download-jdk/microsoft-jdk-21-windows-x64.zip"
$jdk21Zip = "$downloadDir\jdk21.zip"
if (-not (Test-Path "$envRoot\jdk21\bin\java.exe")) {
    Download-File -Url $jdk21Url -OutFile $jdk21Zip -Name "JDK 21"
    $tempJdk21 = "$envRoot\jdk21-temp"
    Expand-Zip -ZipFile $jdk21Zip -DestDir $tempJdk21 -Name "JDK 21"
    $jdk21Dir = Get-ChildItem $tempJdk21 -Directory | Select-Object -First 1
    if ($jdk21Dir) { Move-Item $jdk21Dir.FullName "$envRoot\jdk21" -Force }
    Remove-Item $tempJdk21 -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "[完成] JDK 21 安装完成" -ForegroundColor Green
} else {
    Write-Host "[跳过] JDK 21 已安装" -ForegroundColor Yellow
}

# ============================================================
# 验证安装
# ============================================================
Write-Host "`n========== 安装验证 ==========" -ForegroundColor Magenta
$checks = @(
    @{Name="Node.js"; Path="$envRoot\node\node.exe"; Cmd="node --version"},
    @{Name="npm"; Path="$envRoot\node\npm.cmd"; Cmd=$null},
    @{Name="Python"; Path="$envRoot\python\python.exe"; Cmd="python --version"},
    @{Name="CMake"; Path="$envRoot\cmake\bin\cmake.exe"; Cmd="cmake --version"},
    @{Name="Rust (cargo)"; Path="$envRoot\rust\cargo\bin\cargo.exe"; Cmd=$null},
    @{Name="JDK 21"; Path="$envRoot\jdk21\bin\java.exe"; Cmd="java -version"}
)
foreach ($c in $checks) {
    if (Test-Path $c.Path) {
        Write-Host "[OK] $($c.Name)" -ForegroundColor Green
    } else {
        Write-Host "[缺失] $($c.Name)" -ForegroundColor Red
    }
}
Write-Host "`n========== 安装完成 ==========" -ForegroundColor Green
Write-Host "请重新运行 set-env.ps1 配置环境变量" -ForegroundColor Yellow
