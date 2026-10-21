import { Hono } from "hono";
import { neon, types } from "@neondatabase/serverless";
import { auth } from "./auth";

types.setTypeParser(types.builtins.NUMERIC, (value) => Number(value));
types.setTypeParser(types.builtins.DATE, (value) => value);

type Bindings = { DATABASE_URL: string };
const app = new Hono<{ Bindings: Bindings }>();

function isSubmitOpen(): boolean {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay();
  const hour = kst.getUTCHours();
  if (day === 1 && hour >= 9) return true;
  if (day === 2 && hour < 9) return true;
  return false;
}

function getCurrentWeek(): string {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const weekNum = Math.ceil(
    ((now.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7,
  );
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

async function isLeaderOrAdmin(email, sql) {
  const rows = await sql`SELECT id FROM clan_members WHERE email = ${email} AND (is_leader = true OR is_admin = true)`;
  return rows.length > 0;
}

app.get("/app-api/my-member-info", async (c) => {
  const user = auth(c).user();
  if (!user) return c.json(null);
  const sql = neon(c.env.DATABASE_URL);
  const rows = await sql`SELECT nickname, is_leader FROM clan_members WHERE email = ${user.email}`;
  return c.json(rows[0] ?? null);
});

app.get("/app-api/my-skill-tree", async (c) => {
  const user = auth(c).user();
  if (!user) return c.json([]);
  const sql = neon(c.env.DATABASE_URL);
  const rows = await sql`SELECT * FROM member_skill_tree WHERE email = ${user.email} ORDER BY skill_key, stage`;
  return c.json(rows);
});

app.put("/app-api/my-skill-tree", async (c) => {
  const user = auth(c).user();
  if (!user) return c.json({ error: "인증 필요" }, 403);
  const { skill_key, stage, level } = await c.req.json();
  if (!skill_key || !stage || level === undefined) return c.json({ error: "잘못된 요청" }, 400);
  if (level < 0 || level > 5) return c.json({ error: "레벨은 0~5 사이여야 해요." }, 400);
  const sql = neon(c.env.DATABASE_URL);
  const [row] = await sql`
    INSERT INTO member_skill_tree (email, skill_key, stage, level)
    VALUES (${user.email}, ${skill_key}, ${stage}, ${level})
    ON CONFLICT (email, skill_key, stage)
    DO UPDATE SET level = ${level}, updated_at = NOW()
    RETURNING *
  `;
  return c.json(row);
});

app.get("/app-api/skill-tree/:email", async (c) => {
  const user = auth(c).user();
  if (!user || !(await isLeaderOrAdmin(user.email, neon(c.env.DATABASE_URL)))) return c.json({ error: "권한이 없어요." }, 403);
  const targetEmail = c.req.param("email");
  const sql = neon(c.env.DATABASE_URL);
  const rows = await sql`SELECT * FROM member_skill_tree WHERE email = ${targetEmail} ORDER BY skill_key, stage`;
  return c.json(rows);
});

app.get("/app-api/clan-skills", async (c) => {
  const sql = neon(c.env.DATABASE_URL);
  const rows = await sql`SELECT * FROM clan_skills ORDER BY id ASC`;
  return c.json(rows);
});

app.put("/app-api/clan-skills/:id", async (c) => {
  const user = auth(c).user();
  if (!user) return c.json({ error: "인증 필요" }, 403);
  const sql = neon(c.env.DATABASE_URL);
  const leaders = await sql`SELECT id FROM clan_members WHERE email = ${user.email} AND is_leader = true`;
  if (leaders.length === 0) return c.json({ error: "리더만 수정할 수 있어요." }, 403);
  const id = c.req.param("id");
  const { description, value } = await c.req.json();
  const [row] = await sql`
    UPDATE clan_skills SET description = ${description}, value = ${value ?? 0}, updated_by = ${user.email}, updated_at = NOW()
    WHERE id = ${id} RETURNING *
  `;
  return c.json(row);
});

app.get("/app-api/members", async (c) => {
  const sql = neon(c.env.DATABASE_URL);
  const rows = await sql`SELECT * FROM clan_members ORDER BY nickname ASC`;
  return c.json(rows);
});

app.post("/app-api/members", async (c) => {
  const { nickname, email, is_leader } = await c.req.json();
  if (!nickname || !email) return c.json({ error: "닉네임과 이메일은 필수입니다." }, 400);
  const sql = neon(c.env.DATABASE_URL);
  const [row] = await sql`INSERT INTO clan_members (nickname, email, is_leader) VALUES (${nickname}, ${email}, ${is_leader ?? false}) RETURNING *`;
  return c.json(row, 201);
});

app.patch("/app-api/members/:id/role", async (c) => {
  const user = auth(c).user();
  if (!user) return c.json({ error: "인증 필요" }, 403);
  const sql = neon(c.env.DATABASE_URL);
  const leaders = await sql`SELECT id FROM clan_members WHERE email = ${user.email} AND is_leader = true`;
  if (leaders.length === 0) return c.json({ error: "리더만 역할을 변경할 수 있어요." }, 403);
  const id = c.req.param("id");
  const { role } = await c.req.json();
  const validRoles = ["지휘관", "대장", "장로", "클랜원"];
  if (!validRoles.includes(role)) return c.json({ error: "올바르지 않은 역할이에요." }, 400);
  const isAdmin = role === "지휘관" || role === "대장";
  const isLeader = role === "지휘관";
  const [row] = await sql`UPDATE clan_members SET role = ${role}, is_admin = ${isAdmin}, is_leader = ${isLeader} WHERE id = ${id} RETURNING *`;
  return c.json(row);
});

app.delete("/app-api/members/:id", async (c) => {
  const id = c.req.param("id");
  const sql = neon(c.env.DATABASE_URL);
  await sql`DELETE FROM clan_members WHERE id = ${id}`;
  return c.json({ ok: true });
});

app.post("/app-api/records", async (c) => {
  if (!isSubmitOpen()) return c.json({ error: "입력 기간이 아닙니다. 매주 월요일 09:00 ~ 화요일 09:00에만 제출할 수 있어요." }, 403);
  const user = auth(c).user();
  const body = await c.req.json();
  const { email, week_label, egg_shell, egg_count, spring, vehicle_count, skill_ticket, egg_shell_waiting, spring_waiting, skill_ticket_waiting } = body;
  const targetEmail = email || user?.email;
  if (!targetEmail) return c.json({ error: "이메일이 필요합니다." }, 400);
  const week = week_label || getCurrentWeek();
  const sql = neon(c.env.DATABASE_URL);
  const existing = await sql`SELECT id FROM resource_records WHERE email = ${targetEmail} AND week_label = ${week}`;
  if (existing.length > 0) {
    const [updated] = await sql`UPDATE resource_records SET egg_shell = ${egg_shell ?? 0}, egg_count = ${egg_count ?? 0}, spring = ${spring ?? 0}, vehicle_count = ${vehicle_count ?? 0}, skill_ticket = ${skill_ticket ?? 0}, egg_shell_waiting = ${egg_shell_waiting ?? false}, spring_waiting = ${spring_waiting ?? false}, skill_ticket_waiting = ${skill_ticket_waiting ?? false}, submitted_at = NOW() WHERE email = ${targetEmail} AND week_label = ${week} RETURNING *`;
    return c.json(updated);
  }
  const members = await sql`SELECT id FROM clan_members WHERE email = ${targetEmail}`;
  const memberId = members[0]?.id ?? null;
  const [row] = await sql`INSERT INTO resource_records (member_id, email, week_label, egg_shell, egg_count, spring, vehicle_count, skill_ticket, egg_shell_waiting, spring_waiting, skill_ticket_waiting) VALUES (${memberId}, ${targetEmail}, ${week}, ${egg_shell ?? 0}, ${egg_count ?? 0}, ${spring ?? 0}, ${vehicle_count ?? 0}, ${skill_ticket ?? 0}, ${egg_shell_waiting ?? false}, ${spring_waiting ?? false}, ${skill_ticket_waiting ?? false}) RETURNING *`;
  return c.json(row, 201);
});

app.get("/app-api/records", async (c) => {
  const user = auth(c).user();
  if (!user || !(await isLeaderOrAdmin(user.email, neon(c.env.DATABASE_URL)))) return c.json({ error: "권한이 없어요." }, 403);
  const week = c.req.query("week");
  const sql = neon(c.env.DATABASE_URL);
  const rows = week
    ? await sql`SELECT r.*, m.nickname FROM resource_records r LEFT JOIN clan_members m ON m.email = r.email WHERE r.week_label = ${week} ORDER BY m.nickname ASC`
    : await sql`SELECT r.*, m.nickname FROM resource_records r LEFT JOIN clan_members m ON m.email = r.email ORDER BY r.week_label DESC, m.nickname ASC`;
  return c.json(rows);
});

app.get("/app-api/my-records", async (c) => {
  const user = auth(c).user();
  if (!user) return c.json([]);
  const sql = neon(c.env.DATABASE_URL);
  const rows = await sql`SELECT * FROM resource_records WHERE email = ${user.email} ORDER BY week_label DESC`;
  return c.json(rows);
});

app.get("/app-api/my-current-week", async (c) => {
  const user = auth(c).user();
  if (!user) return c.json(null);
  const week = getCurrentWeek();
  const sql = neon(c.env.DATABASE_URL);
  const rows = await sql`SELECT * FROM resource_records WHERE email = ${user.email} AND week_label = ${week}`;
  return c.json(rows[0] ?? null);
});

app.get("/app-api/weekly-summary", async (c) => {
  const user = auth(c).user();
  if (!user || !(await isLeaderOrAdmin(user.email, neon(c.env.DATABASE_URL)))) return c.json({ error: "권한이 없어요." }, 403);
  const sql = neon(c.env.DATABASE_URL);
  const rows = await sql`SELECT week_label, COUNT(*)::int AS member_count, SUM(egg_shell)::int AS total_egg_shell, SUM(egg_count)::int AS total_egg_count, SUM(spring)::int AS total_spring, SUM(vehicle_count)::int AS total_vehicle_count, SUM(skill_ticket)::int AS total_skill_ticket FROM resource_records GROUP BY week_label ORDER BY week_label ASC`;
  return c.json(rows);
});

app.get("/app-api/ascension-waiting", async (c) => {
  const user = auth(c).user();
  if (!user || !(await isLeaderOrAdmin(user.email, neon(c.env.DATABASE_URL)))) return c.json({ error: "권한이 없어요." }, 403);
  const week = getCurrentWeek();
  const sql = neon(c.env.DATABASE_URL);
  const rows = await sql`SELECT r.*, m.nickname FROM resource_records r LEFT JOIN clan_members m ON m.email = r.email WHERE r.week_label = ${week} AND (r.egg_shell_waiting = true OR r.spring_waiting = true OR r.skill_ticket_waiting = true) ORDER BY m.nickname ASC`;
  return c.json(rows);
});

app.get("/app-api/not-submitted", async (c) => {
  const user = auth(c).user();
  if (!user || !(await isLeaderOrAdmin(user.email, neon(c.env.DATABASE_URL)))) return c.json({ error: "권한이 없어요." }, 403);
  const week = getCurrentWeek();
  const sql = neon(c.env.DATABASE_URL);
  const rows = await sql`SELECT m.id, m.nickname, m.email, m.is_leader FROM clan_members m WHERE m.email NOT IN (SELECT email FROM resource_records WHERE week_label = ${week}) ORDER BY m.nickname ASC`;
  return c.json(rows);
});

app.get("/app-api/current-stats", async (c) => {
  const user = auth(c).user();
  if (!user || !(await isLeaderOrAdmin(user.email, neon(c.env.DATABASE_URL)))) return c.json({ error: "권한이 없어요." }, 403);
  const week = getCurrentWeek();
  const sql = neon(c.env.DATABASE_URL);
  const [stats] = await sql`SELECT COUNT(*)::int AS submitted_count, COALESCE(SUM(egg_shell), 0)::int AS total_egg_shell, COALESCE(SUM(egg_count), 0)::int AS total_egg_count, COALESCE(SUM(spring), 0)::int AS total_spring, COALESCE(SUM(vehicle_count), 0)::int AS total_vehicle_count, COALESCE(SUM(skill_ticket), 0)::int AS total_skill_ticket FROM resource_records WHERE week_label = ${week}`;
  const [total] = await sql`SELECT COUNT(*)::int AS total FROM clan_members`;
  return c.json({ ...stats, total_members: total.total, week });
});

export default { fetch: app.fetch };