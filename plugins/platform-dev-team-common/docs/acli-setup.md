# Atlassian CLI (acli) 설정 가이드

Jira 연동을 위해 Atlassian CLI를 설치하고 인증을 설정합니다.

## 설치

### macOS (Homebrew)

```bash
brew tap atlassian/homebrew-acli
brew install acli
```

### macOS (직접 다운로드)

```bash
# Apple Silicon
curl -LO "https://acli.atlassian.com/darwin/latest/acli_darwin_arm64/acli"

# Intel
curl -LO "https://acli.atlassian.com/darwin/latest/acli_darwin_amd64/acli"

chmod +x ./acli
sudo mv ./acli /usr/local/bin/acli
```

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
- 업데이트: `brew upgrade acli`
- 공식 문서: https://developer.atlassian.com/cloud/acli/guides/introduction/
