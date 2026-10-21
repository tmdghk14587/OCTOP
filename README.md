# 클랜 재화 관리

게임 클랜 50명의 매주 재화량을 조사·관리하는 웹앱.

## 주요 기능
- 클랜원 매주 재화 입력 (알껍질, 알갯수, 태엽, 탈것, 스킬티켓)
- 승천 대기 체크박스
- 클랜 현황 / 주간 기록 / 차트 (리더·관리자 전용)
- 클랜원 관리 + 역할 시스템 (리더 / 지휘관 / 대장 / 장로 / 클랜원)
- 클랜 기술 레벨 관리 (일차별·재화별 점수 증가)
- 나의 기술트리 (스킬소환 비용감소 / 탈것소환 비용감소 / 추가소환기회)
- 클랜전 일차별 예상 점수 자동 계산
- 입력 가능 시간: 매주 월요일 09:00 ~ 화요일 09:00 (KST)

## 기술 스택
- React 19 + React Router DOM 7
- Hono (백엔드 API)
- Tailwind CSS v4
- Neon Postgres (데이터베이스)
- TypeScript

## 환경변수 (.env)
```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME
```

## DB 스키마
```sql
CREATE TABLE clan_members (
  id BIGSERIAL PRIMARY KEY,
  nickname TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  is_leader BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE clan_skills (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  value INTEGER DEFAULT 0,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE member_skill_tree (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  skill_key TEXT NOT NULL,
  stage INTEGER NOT NULL DEFAULT 1,
  level INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, skill_key, stage)
);
```

## 주의사항
- `server.ts`의 `import { auth } from "./auth"`는 Glide 플랫폼 전용입니다.
- 다른 환경(Vercel 등)으로 이전 시 Supabase Auth 등으로 교체가 필요합니다.
