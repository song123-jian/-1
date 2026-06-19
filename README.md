# 冠久ERP 3.0.0

冠久ERP 桌面客户端和移动端安装包。

## 产物清单

| 文件 | 类型 | 大小 | 说明 |
|------|------|------|------|
| 冠久ERP-Setup-3.0.0.exe | Windows 安装包 | 14.9 MB | 双击安装并自动启动 |
| 冠久ERP-Portable-3.0.0.exe | Windows 便携版 | 14.9 MB | 双击自动解压并运行，免安装 |
| guanjiuerp-3.0.0-release.apk | Android 安装包 | 18.35 MB | Flutter 构建，已签名 |

## 构建技术栈

- 后端：Go 1.22.5 + Gin
- 桌面端：Flutter 3.22.2（Windows）
- 移动端：Flutter 3.22.2（Android）
- 打包：Go embed 自解压程序

## 使用说明

### Windows 安装包
双击 `冠久ERP-Setup-3.0.0.exe`，自动解压并启动冠久ERP。

### Windows 便携版
双击 `冠久ERP-Portable-3.0.0.exe`，自动解压到临时目录并启动。

### Android APK
将 `guanjiuerp-3.0.0-release.apk` 安装到 Android 设备，开启"未知来源"后安装。

## 签名信息

- Android APK 已使用 release.keystore 签名
- 密钥别名：guanjiu
- 有效期：100 年
- 应用包名：com.guanjiu.erp
