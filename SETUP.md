# 클랜 재화 관리 — 설정 가이드

## ⚠️ 중요: 이 소스코드에 대해

이 저장소의 소스코드는 **Glide 플랫폼** (glideapps.com)에서 동작하도록 만들어졌습니다.

### Glide 전용 의존성

| 파일 | Glide 전용 코드 | 대체 방법 |
|------|----------------|-----------|
| `server.ts` | `import { auth } from "./auth"` | Supabase Auth |
| `client/pages/MyResources.tsx` | `import { session } from "../../auth"` | Supabase Auth |
| 모든 컴포넌트 | `import { cn } from "@glide/cn"` | `clsx` + `tailwind-merge` |

### 현재 Glide에서 동작 중인 앱

앱은 현재 Glide에서 정상 동작 중입니다.
클랜원 50명이 이메일로 가입 후 사용할 수 있습니다.

### 다른 플랫폼으로 이전하려면

1. `@glide/cn` → `clsx` + `tailwind-merge` 패키지로 교체
2. `./auth` 헬퍼 → Supabase Auth SDK로 교체
3. `c.env.DATABASE_URL` → 환경변수로 교체
4. Hono 서버 → Vercel Edge Function / Next.js API 라우트로 변환

## 환경변수

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME
```

## DB 스키마 실행 순서

1. Supabase 또는 Neon에서 새 프로젝트 생성
2. SQL Editor에서 아래 실행:

```sql
-- 1. 클랜원 테이블
CREATE TABLE clan_members (
  id BIGSERIAL PRIMARY KEY,
  nickname TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  is_leader BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT '클랜원',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 재화 기록 테이블
CREATE TABLE resource_records (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT REFERENCES clan_members(id),
  email TEXT NOT NULL,
  week_label TEXT NOT NULL,
  egg_shell INTEGER DEFAULT 0,
  egg_count INTEGER DEFAULT 0,
  spring INTEGER DEFAULT 0,
  vehicle_count INTEGER DEFAULT 0,
  skill_ticket INTEGER DEFAULT 0,
  egg_shell_waiting BOOLEAN DEFAULT FALSE,
  spring_waiting BOOLEAN DEFAULT FALSE,
  skill_ticket_waiting BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 클랜 기술 테이블
CREATE TABLE clan_skills (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  value INTEGER DEFAULT 0,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 개인 기술트리 테이블
CREATE TABLE member_skill_tree (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  skill_key TEXT NOT NULL,
  stage INTEGER NOT NULL DEFAULT 1,
  level INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, skill_key, stage)
);

-- 5. 클랜 기술 초기 데이터 삽입
INSERT INTO clan_skills (name, description, value) VALUES
  ('전쟁 1일차 점수 증가', '화요일 스킬티켓 소환 점수 증가 (레벨당 4%)', 0),
  ('전쟁 2일차 점수 증가', '수요일 탈것 소환/합치기 점수 증가 (레벨당 4%)', 0),
  ('전쟁 3일차 점수 증가', '목요일 스킬 소환/알 합치기 점수 증가 (레벨당 4%)', 0),
  ('전쟁 4일차 점수 증가', '금요일 탈것 소환 점수 증가 (레벨당 4%)', 0),
  ('전쟁 5일차 점수 증가', '토요일 알 합치기 점수 증가 (레벨당 4%)', 0),
  ('탈것 소환 점수 증가', '탈것 소환 점수 증가 (레벨당 4%)', 0),
  ('탈것 합치기 점수 증가', '탈것 합치기 점수 증가 (레벨당 4%)', 0),
  ('알 합치기 점수 증가', '알 합치기 점수 증가 (레벨당 4%)', 0),
  ('스킬 소환 점수 증가', '스킬 소환 점수 증가 (레벨당 4%)', 0);

-- 6. 리더 계정 등록 (이메일 교체 필요)
INSERT INTO clan_members (nickname, email, is_leader, is_admin, role)
VALUES ('GoGil', 'your-email@example.com', TRUE, TRUE, '지휘관');
```
