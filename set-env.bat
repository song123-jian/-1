@echo off
set "ENV_ROOT=d:\RJBC\env"

set "GOROOT=%ENV_ROOT%\go"
set "GOPATH=%ENV_ROOT%\gopath"
set "GOMODCACHE=%ENV_ROOT%\gopath\pkg\mod"
set "PATH=%ENV_ROOT%\go\bin;%ENV_ROOT%\gopath\bin;%PATH%"

set "PATH=%ENV_ROOT%\flutter\bin;%PATH%"
set "PATH=%ENV_ROOT%\git\cmd;%PATH%"

set "JAVA_HOME=%ENV_ROOT%\jdk"
set "PATH=%ENV_ROOT%\jdk\bin;%PATH%"

set "ANDROID_HOME=%ENV_ROOT%\android-sdk"
set "ANDROID_SDK_ROOT=%ENV_ROOT%\android-sdk"
set "PATH=%ENV_ROOT%\android-sdk\platform-tools;%ENV_ROOT%\android-sdk\cmdline-tools\latest\bin;%PATH%"

set "PATH=%ENV_ROOT%\node;%ENV_ROOT%\node\npm-global;%PATH%"
set "PATH=%ENV_ROOT%\python;%ENV_ROOT%\python\Scripts;%PATH%"
set "PATH=%ENV_ROOT%\cmake\bin;%PATH%"

set "RUSTUP_HOME=%ENV_ROOT%\rust\rustup"
set "CARGO_HOME=%ENV_ROOT%\rust\cargo"
set "RUSTUP_DIST_SERVER=https://mirrors.tuna.tsinghua.edu.cn/rustup"
set "RUSTUP_UPDATE_ROOT=https://mirrors.tuna.tsinghua.edu.cn/rustup/rustup"
set "PATH=%ENV_ROOT%\rust\cargo\bin;%PATH%"

set "JAVA_HOME_21=%ENV_ROOT%\jdk21"
set "PATH=%ENV_ROOT%\jdk21\bin;%PATH%"

set "GRADLE_HOME=%ENV_ROOT%\gradle"
set "GRADLE_USER_HOME=%ENV_ROOT%\.gradle"
set "MAVEN_HOME=%ENV_ROOT%\maven"
set "PATH=%ENV_ROOT%\gradle\bin;%ENV_ROOT%\maven\bin;%PATH%"

set "GOPROXY=https://goproxy.cn,direct"
