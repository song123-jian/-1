# 冠久ERP 3.0.0

冠久ERP 是一个基于 Go + Flutter 的桌面端和移动端 ERP 系统。

## 项目结构

```
.
├── backend/          # Go 后端服务（Gin 框架）
│   ├── main.go
│   ├── go.mod
│   └── go.sum
├── frontend/         # Flutter 前端（Windows + Android）
│   ├── lib/          # Dart 源码
│   ├── android/      # Android 配置
│   ├── windows/      # Windows 配置
│   ├── pubspec.yaml
│   └── README.md
├── scripts/          # 构建和部署脚本
│   ├── build-all.ps1
│   ├── build-apk.ps1
│   ├── build-exe.ps1
│   └── install-env.ps1
├── set-env.bat       # Windows 环境变量设置
└── set-env.ps1       # PowerShell 环境变量设置
```

## 技术栈

- **后端**：Go 1.22.5 + Gin
- **桌面端**：Flutter 3.22.2（Windows）
- **移动端**：Flutter 3.22.2（Android）
- **打包**：Go embed 自解压程序

## 快速开始

### 1. 设置环境

```powershell
.\set-env.ps1
```

或

```bat
set-env.bat
```

### 2. 构建后端

```powershell
cd backend
go build -o backend.exe
```

### 3. 构建前端

```powershell
cd frontend
flutter pub get
flutter build windows --release
flutter build apk --release
```

### 4. 一键构建全部

```powershell
cd scripts
.\build-all.ps1
```

## 构建产物

构建完成后，产物位于 `build/` 目录下：

- `build/exe/` - Windows 可执行文件
- `build/apk/` - Android 安装包
- `build/release/` - 最终发布版本

## 注意

本仓库不包含构建产物（`.exe`、`.apk` 等），构建产物由 `.gitignore` 忽略。
