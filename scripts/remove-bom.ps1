#requires -Version 5.1
<#
.SYNOPSIS
    批量移除项目文件中的 UTF-8 BOM 标记。

.DESCRIPTION
    扫描指定目录下的 .vue/.js/.ts/.css/.json/.html 文件，
    检测并移除 UTF-8 BOM (EF BB BF)，统一为 UTF-8 without BOM。

.PARAMETER Path
    要扫描的项目根目录，默认为脚本所在目录的父级（项目根）。

.PARAMETER Include
    要包含的文件扩展名数组。

.EXAMPLE
    .\scripts\remove-bom.ps1
    # 使用默认参数扫描 src 目录

.EXAMPLE
    .\scripts\remove-bom.ps1 -Path "D:\\my-project" -Include @("*.vue","*.js")
    # 扫描指定目录的 vue 和 js 文件
#>

param(
    [string]$Path = (Join-Path $PSScriptRoot '..\src'),
    [string[]]$Include = @('*.vue', '*.js', '*.ts', '*.css', '*.json', '*.html', '*.cjs', '*.mjs')
)

$resolvedPath = Resolve-Path $Path -ErrorAction SilentlyContinue
if (-not $resolvedPath) {
    Write-Host "错误：路径不存在: $Path" -ForegroundColor Red
    exit 1
}

$BOM = [byte[]]@(0xEF, 0xBB, 0xBF)
$removedCount = 0
$checkedCount = 0

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  冠久ERP - UTF-8 BOM 清理工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "扫描目录: $resolvedPath" -ForegroundColor Gray
Write-Host "包含类型: $($Include -join ', ')" -ForegroundColor Gray
Write-Host ""

foreach ($pattern in $Include) {
    $files = Get-ChildItem -Path $resolvedPath -Recurse -Include $pattern -File
    foreach ($file in $files) {
        $checkedCount++
        try {
            $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
            if ($bytes.Length -ge 3 -and
                $bytes[0] -eq $BOM[0] -and
                $bytes[1] -eq $BOM[1] -and
                $bytes[2] -eq $BOM[2]) {

                $newBytes = New-Object byte[] ($bytes.Length - 3)
                [Array]::Copy($bytes, 3, $newBytes, 0, $bytes.Length - 3)
                [System.IO.File]::WriteAllBytes($file.FullName, $newBytes)

                Write-Host "[已清理] $($file.FullName)" -ForegroundColor Green
                $removedCount++
            }
        }
        catch {
            Write-Host "[跳过] $($file.FullName) - $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "扫描完成：检查 $checkedCount 个文件" -ForegroundColor Cyan
if ($removedCount -gt 0) {
    Write-Host "清理 BOM：$removedCount 个文件" -ForegroundColor Green
} else {
    Write-Host "未发现 BOM，所有文件编码已统一" -ForegroundColor Green
}
Write-Host "========================================" -ForegroundColor Cyan
