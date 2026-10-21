# 클랜 재화 관리

게임 클랜 50명의 매주 재화량을 조사·관리하는 웹앱.

## 기술 스택
- React 19 + React Router DOM 7
- Hono (서버 API)
- Tailwind CSS v4
- Neon Postgres (DB)
- TypeScript

## 주요 기능
- 클랜원 매주 재화 입력 (알껍질, 알갯수, 태엽, 탈것, 스킬티켓)
- 승천 대기 체크박스
- 클랜 현황 (리더/관리자 전용)
- 주간 기록 및 차트
- 클랜원 관리 + 역할 시스템
- 클랜 기술 레벨 관리
- 나의 기술트리 (스킬소환 비용감소, 탈것소환 비용감소, 추가소환기회)
- 클랜전 일차별 예상 점수 계산

## 입력 가능 시간
매주 월요일 09:00 ~ 화요일 09:00 (KST)

## DB 스키마
```sql
CREATE TABLE clan_members (id BIGSERIAL PRIMARY KEY, nickname TEXT, email TEXT UNIQUE, is_leader BOOLEAN DEFAULT FALSE, is_admin BOOLEAN DEFAULT FALSE, role TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE resource_records (id BIGSERIAL PRIMARY KEY, member_id BIGINT, email TEXT, week_label TEXT, egg_shell INT DEFAULT 0, egg_count INT DEFAULT 0, spring INT DEFAULT 0, vehicle_count INT DEFAULT 0, skill_ticket INT DEFAULT 0, egg_shell_waiting BOOLEAN DEFAULT FALSE, spring_waiting BOOLEAN DEFAULT FALSE, skill_ticket_waiting BOOLEAN DEFAULT FALSE, submitted_at TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE clan_skills (id BIGSERIAL PRIMARY KEY, name TEXT, description TEXT, value INT DEFAULT 0, updated_by TEXT, updated_at TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE member_skill_tree (id BIGSERIAL PRIMARY KEY, email TEXT, skill_key TEXT, stage INT, level INT DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(email, skill_key, stage));
```
