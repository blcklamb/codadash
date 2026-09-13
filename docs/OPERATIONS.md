# codadash (코다대시) 운영·배포 안내

## 로컬 실행과 환경 변수

Node.js 24 LTS에서 `npm ci`, `.env.example`을 `.env`로 복사한 뒤 `npm run dev`를 실행한다. 프런트는 5173, 게임 서버는 3001이다. 외부 키가 없으면 게스트 플레이·기기 기록·초대 대전이 동작한다. 로그인을 가짜로 통과시키거나 계정 저장을 로컬 저장으로 위장하지 않는다.

| 변수                          | 위치        | 용도                                                        |
| ----------------------------- | ----------- | ----------------------------------------------------------- |
| PORT                          | 서버        | 게임 서버 포트, 로컬 기본 3001                              |
| WEB_ORIGIN                    | 서버        | 허용 프런트 URL, 쉼표 구분                                  |
| SUPABASE_URL                  | 서버        | 실제 Supabase 프로젝트 URL                                  |
| SUPABASE_SECRET_KEY           | 서버만      | 검증된 기록 저장용 Secret 키                                |
| VITE_SUPABASE_URL             | 프런트 빌드 | Supabase 프로젝트 URL                                       |
| VITE_SUPABASE_PUBLISHABLE_KEY | 프런트 빌드 | 공개 가능한 Publishable 키                                  |
| VITE_API_URL                  | 프런트 빌드 | 공개 게임 서버의 HTTPS 주소. 로컬은 비워서 Vite 프록시 사용 |

Secret 키에 `VITE_` 접두사를 붙이지 않는다. `.env`는 Git에서 제외한다. 새 프로젝트는 Publishable/Secret 키를 사용한다. 기존 `VITE_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` 이름도 호환된다.

키 입력 후 `npm run check:supabase`로 URL 일치, 브라우저 키 종류, 테이블·뷰 존재, GitHub 공급자 활성화를 읽기 전용으로 확인한다. 이 명령은 키와 사용자 데이터를 출력하지 않는다. `.env`를 변경했다면 개발 서버를 재시작한다.

API 키 공식 안내: https://supabase.com/docs/guides/getting-started/api-keys

## Supabase와 GitHub

1. Supabase 프로젝트를 준비한다. 게임 서버와 가까운 리전을 선택한다.
2. `supabase/migrations/202609100001_keybit.sql`을 적용한다.
3. Supabase Auth에서 GitHub 공급자를 활성화한다.
4. GitHub OAuth 앱의 callback URL은 Supabase가 제공하는 `https://<project-ref>.supabase.co/auth/v1/callback`으로 설정한다.
5. 로컬에서는 Site URL을 `http://127.0.0.1:5173`으로 설정하고 Redirect URLs에 `http://127.0.0.1:5173/auth/callback`, `http://localhost:5173/auth/callback`을 추가한다. 공개 배포 후에는 실제 프런트 URL 및 `<프런트 URL>/auth/callback`도 추가한다.
6. 서버와 프런트 환경 변수를 각각 설정한다.
7. 실제 GitHub 계정 로그인 → 개인 연습 완료 → 다른 브라우저 로그인 → 같은 기록 조회를 검증한다.
8. 사용자 A의 토큰으로 B의 기록을 조회하거나 쓰지 못하는지 실제 프로젝트에서도 확인한다.

공식 설정: https://supabase.com/docs/guides/auth/social-login/auth-github

로컬 PostgreSQL 스키마/RLS 테스트는 외부 OAuth 검증을 대체하지 않는다.

## Render 게임 서버

`render.yaml`에 Node 서버 구성과 180초 종료 유예를 제공한다.

- 저장소: keybit 프로젝트를 연결한다.
- 빌드: `npm ci && npm run build`
- 실행: `npm start`
- 상태 확인: `/healthz`
- 필수 환경: WEB_ORIGIN, SUPABASE_URL, SUPABASE_SECRET_KEY.
- 단일 인스턴스로 시작한다. 여러 인스턴스를 바로 켜면 방 메모리가 공유되지 않는다.

SIGTERM 시 새 경기를 받지 않고 기존 경기와 결과 저장을 최대 180초 기다린다. 갑작스러운 프로세스 종료 시 실시간 게임은 복구되지 않고 무효/중단 처리한다. 다음 실행 때 DB의 미완료 세션을 정리한다.

공식 연결·종료 안내: https://render.com/docs/websocket

## Cloudflare Pages 프런트

- 빌드 명령: `npm ci && npm run build`
- 결과 폴더: `dist`
- Node 버전: 24.
- 프런트 빌드 환경에 VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY를 설정한다.
- `apps/web/public/_redirects`가 화면 경로의 새로고침을 SPA로 연결한다.
- 배포된 프런트 URL을 Render의 WEB_ORIGIN과 Supabase의 리디렉션 허용 목록에 추가한다.
- GitHub callback과 초대 링크를 공개 URL에서 다시 확인한다.

프런트에 서버 결과물 `dist-server`, 소스 `.env`, 서비스 역할 키를 업로드하지 않는다.

## 비용 기준

2026-09 확인 기준으로 Cloudflare Pages 무료 범위 + Render 월 7달러급 서버 + Supabase Pro 월 25달러부터를 제안한다. 합계 월 32달러 수준이며 환율·세금·도메인·사용량 초과는 별도다. 실제 구매 전 각 서비스 요금을 확인한다.

- https://render.com/pricing
- https://supabase.com/pricing
- https://developers.cloudflare.com/pages/platform/limits/

## 모니터링과 제한

- `/healthz`로 준비 상태와 방 수를 확인한다.
- 결과 종료 이벤트는 세션 ID·모드·승패만 구조화 로그로 남긴다.
- 코드 입력과 인증 토큰을 로그에 남기지 않는다.
- `tests/load.ts`는 입력 확인 지연·최종 승패 일치·오류를 `output/load-report.json`에 기록한다.
- 접속 복구는 10초, 개인 세션 결과 재조회는 종료 후 10분, 무활동 방은 15분을 기준으로 정리한다.
- 비회원 기록은 최근 1,000개를 해당 브라우저에 저장한다. 기기 저장 차단 시 플레이는 허용하고 저장 실패를 표시한다.
- 최근 기록 API는 최근 1,000개를 조회한다. 전체 최고 기록은 별도 DB 뷰로, 일일 연습일은 중복 제거된 전체 날짜 조회로 계산하므로 최근 기록 제한과 무관하게 유지된다. 비회원도 최고 기록·연습일은 최근 세션과 별도로 보존한다.
- 인증 사용자 결과 저장 재시도 큐는 서버 메모리에 있다. DB 장애와 프로세스 강제 종료가 겹치면 저장되지 않은 결과를 잃을 수 있다. 배포 검증에서 이 경우를 명시하고, 서비스 성장 시 영속 작업 큐로 확장한다.
- 새 코드·규칙 버전은 한국 시간 자정에 맞춰 배포한다. 기존 날짜의 콘텐츠를 배포 중간에 덮어쓰지 않는다. 여러 버전 동시 운영이 필요해지면 일일 세트의 버전 매핑을 DB에 영속화한다.

이 제한은 일반 플레이·실시간 상태 판정과 별개다. 개발 중 만든 자료를 검증된 공개 서비스로 오인하지 않도록 `VALIDATION.md`에서 실제 확인 범위를 관리한다.

## 제품 지표 확인

출시 후 수집할 지표는 연습 완료율·재도전율·일일 완료·초대 전환·재대결·재방문이다. 현재 코드의 세션 시작/종료 테이블과 결과 로그로 완료 수와 승패를 확인할 수 있다. 방문 세션 기반 재방문/전환 이벤트의 별도 분석 수집은 아직 외부 분석 서비스에 연결하지 않았다. 실측되지 않은 수치를 제품 화면에 표시하지 않는다.

## codadash 검색 설정

- 프런트 빌드 환경의 `VITE_SITE_URL`에 최종 공개 origin을 입력한다(경로·쿼리 없이 `https://실제도메인`). 빌드 시 canonical, Open Graph URL, 사이트 이름 구조화 데이터와 `sitemap.xml`에 사용한다. 기본 공개 주소는 사용자가 지정한 `https://codadash.vercel.app`이며, 도메인이 바뀌면 이 값을 덮어쓴다.
- 빌드는 홈·일일 연습·대전·기록·설정의 초기 HTML을 각각 생성한다. 검색봇과 공유 서비스는 JavaScript 실행 없이 제목·설명·기본 소개를 읽을 수 있다. `_redirects`의 페이지별 규칙을 전체 SPA 규칙보다 먼저 유지한다.
- 사이트맵에는 공개 연습 페이지 세 개만 포함한다. 기록·설정은 `noindex, follow`이며 초대 코드 등 쿼리는 대표 주소에서 제외한다.
- 배포 후 Google Search Console 및 네이버 서치어드바이저에서 도메인 소유권을 확인하고 `/sitemap.xml`을 제출한다. 실제 공개 URL의 초기 HTML·대표 주소·색인 상태를 확인한다. 검색 노출이나 순위가 보장되는 설정은 아니다.
- 브랜드는 codadash(코다대시)로 변경했다. 기존 브라우저 기록·설정의 `keybit.*` 저장 키, DB 마이그레이션 파일명, 이미 연결된 배포 리소스 식별자는 호환성을 위해 유지한다. 기존 OAuth 앱의 사용자 표시 이름은 관리 화면에서 codadash로 변경할 수 있다.

참고: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics

### Vercel 프런트

`vercel.json`에 Vite 빌드·`dist` 출력과 페이지별 HTML 연결을 설정했다. 공개 대표 주소는 `https://codadash.vercel.app/`이다. 프로젝트의 프런트 환경 변수(VITE_API_URL 및 Supabase 공개 설정)를 유지한다. 서버 프로세스는 별도 실행 환경에서 운영한다. 배포 후 `https://codadash.vercel.app/sitemap.xml`을 검색 관리 도구에 제출한다. 이 변경은 배포 자체를 실행하지 않는다.
