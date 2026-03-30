# Atlassian CLI (acli) 설정 가이드

Jira 연동을 위해 Atlassian CLI를 설치하고 인증을 설정합니다.

## 설치

### macOS

#### Homebrew

```bash
brew tap atlassian/homebrew-acli
brew install acli
```

#### 직접 다운로드

```bash
# Apple Silicon
curl -LO "https://acli.atlassian.com/darwin/latest/acli_darwin_arm64/acli"

# Intel
curl -LO "https://acli.atlassian.com/darwin/latest/acli_darwin_amd64/acli"

chmod +x ./acli
sudo mv ./acli /usr/local/bin/acli
```

### Linux

#### APT (Debian / Ubuntu)

```bash
curl -fsSL https://acli.atlassian.com/linux/apt/gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/acli-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/acli-keyring.gpg] https://acli.atlassian.com/linux/apt stable main" | sudo tee /etc/apt/sources.list.d/acli.list
sudo apt update && sudo apt install acli
```

#### YUM (RHEL / CentOS / Fedora)

```bash
sudo rpm --import https://acli.atlassian.com/linux/yum/gpg.key
sudo tee /etc/yum.repos.d/acli.repo <<'EOF'
[acli]
name=Atlassian CLI
baseurl=https://acli.atlassian.com/linux/yum
enabled=1
gpgcheck=1
gpgkey=https://acli.atlassian.com/linux/yum/gpg.key
EOF
sudo yum install acli
```

#### 직접 다운로드

```bash
# x86_64
curl -LO "https://acli.atlassian.com/linux/latest/acli_linux_amd64/acli"

# ARM64
curl -LO "https://acli.atlassian.com/linux/latest/acli_linux_arm64/acli"

chmod +x ./acli
sudo mv ./acli /usr/local/bin/acli
```

### Windows

#### WinGet

```powershell
winget install Atlassian.acli
```

#### Scoop

```powershell
scoop bucket add atlassian https://acli.atlassian.com/scoop
scoop install acli
```

#### 직접 다운로드

```powershell
# PowerShell에서 실행
Invoke-WebRequest -Uri "https://acli.atlassian.com/windows/latest/acli_windows_amd64/acli.exe" -OutFile "$env:LOCALAPPDATA\acli\acli.exe"

# PATH에 추가 (사용자 환경변수)
[Environment]::SetEnvironmentVariable("Path", "$env:Path;$env:LOCALAPPDATA\acli", "User")
```

> **참고**: 직접 다운로드 시 `%LOCALAPPDATA%\acli\` 디렉토리를 미리 생성하세요.

## 인증 (OAuth)

브라우저 기반 OAuth 인증을 사용합니다:

```bash
acli jira auth login --web
```

브라우저가 열리면 Atlassian 사이트(`datamaker.atlassian.net`)를 선택하고 권한을 허용합니다.

## 인증 확인

```bash
acli jira auth status
```

## 테스트

```bash
# 티켓 조회 테스트
acli jira workitem view SYN-1234 --json

# 버전 확인
acli --version
```

## 참고

- 각 CLI 버전은 릴리스 후 6개월간 지원됩니다. 정기적으로 업데이트하세요.
- 업데이트:
  - macOS: `brew upgrade acli`
  - Linux (APT): `sudo apt update && sudo apt upgrade acli`
  - Linux (YUM): `sudo yum update acli`
  - Windows (WinGet): `winget upgrade Atlassian.acli`
  - Windows (Scoop): `scoop update acli`
- 공식 문서: https://developer.atlassian.com/cloud/acli/guides/introduction/
