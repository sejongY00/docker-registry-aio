# Docker Registry AIO

공식 [`registry:3`](https://hub.docker.com/_/registry) + Nuxt 풀스택(Token Auth · 관리 UI)을 Docker Compose로 한 번에 올리는 로컬/내부망용 프로젝트입니다.

- htpasswd 대신 DB(Prisma 7 / SQLite)에서 사용자를 관리하며, 같은 계정이 `docker login`에도 사용됩니다.
- 관리 UI는 [shadcn-vue](https://www.shadcn-vue.com/) + Tailwind CSS 4 기반이며 라이트/다크 테마를 지원합니다.
- 라이선스: [MIT](LICENSE)

## 구성

| 서비스 | 포트 | 역할 |
|--------|------|------|
| `registry` | `5050` | OCI Distribution Registry |
| `app` | `3080` | Nuxt UI + `/auth/token` + 관리 API |

## 빠른 시작

```bash
cp .env.example .env
docker compose up -d --build
```

Token Auth용 RSA 키/인증서(`certs/token.key`, `certs/token.crt`)는 Compose `certs` 서비스가 **없으면 자동 생성**합니다.

- 관리 UI: http://localhost:3080  
- Registry: `localhost:5050` (macOS AirPlay가 5000을 쓰는 경우가 많아 기본값을 5050으로 둠)
- 기본 관리자: `.env`의 `ADMIN_USERNAME` / `ADMIN_PASSWORD` (기본 `admin` / `admin123`)

```bash
docker login localhost:5050
docker tag alpine:latest localhost:5050/demo/alpine:latest
docker push localhost:5050/demo/alpine:latest
```

## 중요한 환경 변수

- `AUTH_PUBLIC_URL` — **docker 클라이언트가 실제로 호출하는** Nuxt 공개 URL  
  - 로컬: `http://localhost:3080`  
  - 프록시 뒤: `https://registry-ui.example.com`  
  - Registry `auth.token.realm` = `${AUTH_PUBLIC_URL}/auth/token`
- `REGISTRY_PORT` / `APP_PORT` — 호스트 포트 (기본 `5050` / `3080`)
- `REGISTRY_AUTH_SERVICE` / `REGISTRY_AUTH_ISSUER` — Registry와 Auth JWT 설정 (기본 `registry` / `registry-aio`)
  - 주의: registry 컨테이너에는 `REGISTRY_*` 환경변수를 직접 넣지 않습니다(공식 이미지가 설정 오버라이드로 해석함).
- `SESSION_SECRET` — 관리 UI 세션 서명 키 (운영에서 반드시 변경)
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — 최초 admin 시드

`AUTH_PUBLIC_URL`을 바꾼 뒤에는 registry 컨테이너를 재시작하세요.

```bash
docker compose up -d --force-recreate registry
```

## NPM / Traefik 연동

이 프로젝트는 TLS를 내장하지 않습니다. 이미 운영 중인 프록시에 연결하세요.

1. `registry.example.com` → 호스트 `:5050`
2. `registry-ui.example.com` → 호스트 `:3080` (UI + `/auth/token` + `/api`)
3. `.env`에 다음을 설정 후 Compose 재기동:

```env
AUTH_PUBLIC_URL=https://registry-ui.example.com
```

프록시에서 Registry로 큰 이미지 업로드 시 body size 제한을 충분히 올리세요 (예: NPM의 client max body size).

## 사용자 · 권한

UI **사용자** 메뉴에서 계정을 만들고 ACL을 지정합니다.

| 역할 | 권한 |
|------|------|
| `ADMIN` | 전체 pull/push/delete, 사용자 관리 |
| `USER` | 할당된 ACL만 |

ACL 패턴 예:

- `demo/app` — 정확한 저장소
- `demo/*` — 한 단계 하위
- `team/**` — 하위 전체
- `*` — 모든 저장소

## 로컬 개발 (앱만)

```bash
cp .env.example .env
docker compose up -d registry   # certs 서비스가 키를 자동 생성

cd app
cp ../.env.example .env   # 필요 시 TOKEN_* / REGISTRY_INTERNAL_URL 조정
# app/.env 예:
# DATABASE_URL="file:./dev.db"
# REGISTRY_INTERNAL_URL=http://localhost:5050
# TOKEN_KEY_PATH=../certs/token.key
# TOKEN_CERT_PATH=../certs/token.crt
npm install
npx prisma migrate dev
npm run dev
```

앱만 단독으로 띄울 때도 키가 없으면 부트스트랩/`openssl`로 자동 생성합니다(호스트에 openssl 필요).

## 인증 흐름

1. `docker login` / push / pull → Registry가 `401` + `WWW-Authenticate` 반환  
2. 클라이언트가 `AUTH_PUBLIC_URL/auth/token`에 Basic Auth로 토큰 요청  
3. Nuxt가 사용자·ACL을 확인해 RS256 JWT 발급  
4. Registry가 `certs/token.crt`로 JWT 검증

Token Auth 키(`certs/token.key`, `certs/token.crt`)는 Compose `certs` 서비스가 없으면 자동 생성합니다. 새로 발급하려면:

```bash
rm -f certs/token.key certs/token.crt
docker compose up -d --force-recreate
```

## 디렉터리

```
docker-compose.yml
.env.example
config/registry/config.yml.template
certs/                 # compose certs 서비스가 자동 생성 (gitignore)
app/                   # Nuxt + Prisma
```
