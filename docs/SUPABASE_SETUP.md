# codadash (코다대시) Supabase 연결 마무리

프로젝트: `https://yoybgzldhrttgdrzznng.supabase.co`

2026-09-10 확인: 로컬 키 설정, 인증 API, DB 테이블 및 뷰, 실제 계정 기록 저장과 접근 제어 검증이 완료됐다. GitHub 공급자 활성화까지 확인했다. 사용자가 1~~3단계 설정 완료를 알렸으며 실제 로그인 확인을 진행 중이다. 0~~3단계는 다시 실행하지 않는다.

## 0. DB 스키마 적용

Supabase 프로젝트의 SQL Editor에서 새 쿼리를 열고, `/Users/jeong/dev/keybit/supabase/migrations/202609100001_keybit.sql` 전체 내용을 붙여넣어 한 번 실행한다. 이 스크립트는 keybit 전용 테이블·뷰·행 접근 정책을 생성한다. 실행 성공 후 알려주면 실제 프로젝트에서 다시 점검한다. 같은 초기 스크립트를 두 번 실행하지 않는다.

## 1. GitHub OAuth 앱

[GitHub OAuth Apps](https://github.com/settings/developers)에서 새 OAuth App을 등록한다. 기존 keybit용 앱이 있다면 해당 앱을 사용한다.

| 입력 항목                  | 값                                                          |
| -------------------------- | ----------------------------------------------------------- |
| Application name           | keybit local                                                |
| Homepage URL               | `http://127.0.0.1:5173`                                     |
| Authorization callback URL | `https://yoybgzldhrttgdrzznng.supabase.co/auth/v1/callback` |
| Enable Device Flow         | 선택하지 않음                                               |

등록 후 Client ID를 복사하고 Client secret을 생성한다. 이 두 값은 다음 Supabase 설정에만 입력한다. 채팅이나 프런트 환경 변수에 넣지 않는다.

## 2. Supabase GitHub 공급자

[Supabase 프로젝트](https://supabase.com/dashboard/project/yoybgzldhrttgdrzznng) → Authentication → Sign In / Providers → GitHub에서 공급자를 활성화한다. 1단계의 Client ID와 Client secret을 입력하고 저장한다.

## 3. 로그인 후 돌아올 주소

Authentication → URL Configuration에서 아래 내용을 저장한다.

- Site URL: `http://127.0.0.1:5173`
- Redirect URLs: `http://127.0.0.1:5173/auth/callback`
- Redirect URLs 추가 항목: `http://localhost:5173/auth/callback`

GitHub 앱에 넣는 Supabase callback과 여기의 keybit callback은 서로 다른 주소다.

## 4. 실제 로그인 확인

2026-09-10 실제 확인 완료. 사용자가 GitHub 로그인과 30초 연습을 수행했고, Supabase에서 GitHub 계정의 로그인 시각, 연습 기록, 정상 종료 상태와 최고 기록 반영을 확인했다.

공식 안내: [Supabase GitHub 로그인](https://supabase.com/docs/guides/auth/social-login/auth-github), [Supabase API 키](https://supabase.com/docs/guides/getting-started/api-keys).
