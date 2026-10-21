import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { Label } from "../components/Label";
import { Checkbox } from "../components/Checkbox";
import { session } from "../../auth";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { FormItem, FormLabel, FormControl, FormMessage } from "../components/Form";
import { Input } from "../components/Input";
import { toast } from "../components/Toast";

function isSubmitOpen() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay();
  const hour = kst.getUTCHours();
  if (day === 1 && hour >= 9) return true;
  if (day === 2 && hour < 9) return true;
  return false;
}

function getNextOpenTime() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay();
  const daysUntilMonday = day === 0 ? 1 : (8 - day) % 7 || 7;
  const nextMon = new Date(kst);
  nextMon.setUTCDate(kst.getUTCDate() + daysUntilMonday);
  nextMon.setUTCHours(0, 0, 0, 0);
  return nextMon.getUTCFullYear() + "년 " + (nextMon.getUTCMonth() + 1) + "월 " + nextMon.getUTCDate() + "일 (월) 09:00";
}

function getCurrentWeek() {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const weekNum = Math.ceil(((now.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
  return now.getFullYear() + "-W" + String(weekNum).padStart(2, "0");
}

const CURRENT_WEEK = getCurrentWeek();

export default function MyResources() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ["session"], queryFn: () => session.get() });
  const { data: memberInfo } = useQuery({ queryKey: ["my-member-info"], queryFn: () => fetch("/app-api/my-member-info").then(r => r.json()) });
  const { data: existing, isLoading: loadingExisting } = useQuery({ queryKey: ["my-current-week"], queryFn: () => fetch("/app-api/my-current-week").then(r => r.json()) });
  const { data: myHistory = [] } = useQuery({ queryKey: ["my-records"], queryFn: () => fetch("/app-api/my-records").then(r => r.json()) });

  const [form, setForm] = useState({ egg_shell: "", egg_count: "", spring: "", vehicle_count: "", skill_ticket: "", egg_shell_waiting: false, spring_waiting: false, skill_ticket_waiting: false });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (existing && !loadingExisting) {
      setForm({ egg_shell: String(existing.egg_shell ?? ""), egg_count: String(existing.egg_count ?? ""), spring: String(existing.spring ?? ""), vehicle_count: String(existing.vehicle_count ?? ""), skill_ticket: String(existing.skill_ticket ?? ""), egg_shell_waiting: existing.egg_shell_waiting ?? false, spring_waiting: existing.spring_waiting ?? false, skill_ticket_waiting: existing.skill_ticket_waiting ?? false });
    }
  }, [existing, loadingExisting]);

  function validate() {
    const errs = {};
    const fields = [{ key: "egg_shell", label: "알껍질" }, { key: "egg_count", label: "알 갯수" }, { key: "spring", label: "태엽" }, { key: "vehicle_count", label: "탈것 갯수" }, { key: "skill_ticket", label: "스킬티켓 갯수" }];
    for (const f of fields) {
      const val = form[f.key];
      if (val === "") { errs[f.key] = f.label + "을(를) 입력해 주세요."; continue; }
      if (isNaN(Number(val)) || Number(val) < 0) errs[f.key] = "0 이상의 숫자를 입력해 주세요.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/app-api/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ week_label: CURRENT_WEEK, egg_shell: Number(form.egg_shell), egg_count: Number(form.egg_count), spring: Number(form.spring), vehicle_count: Number(form.vehicle_count), skill_ticket: Number(form.skill_ticket), egg_shell_waiting: form.egg_shell_waiting, spring_waiting: form.spring_waiting, skill_ticket_waiting: form.skill_ticket_waiting }) });
      if (!res.ok) throw new Error("제출 실패");
      toast.success("재화 입력 완료! 이번 주 기록이 저장됐어요.");
      queryClient.invalidateQueries({ queryKey: ["my-current-week"] });
      queryClient.invalidateQueries({ queryKey: ["my-records"] });
    } catch { toast.error("저장에 실패했어요. 다시 시도해 주세요."); }
    finally { setSubmitting(false); }
  }

  const alreadySubmitted = !!existing;
  const submitOpen = isSubmitOpen();
  const nextOpen = getNextOpenTime();

  return (
    <div className="space-y-6">
      <PageHeader title="내 재화 입력" actions={<Badge tone="info">{CURRENT_WEEK} 입력 주간</Badge>} />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <div className="space-y-1 mb-4"><h3 className="text-base font-semibold">이번 주 재화 제출</h3><p className="text-sm text-secondary">게임 내 가방 및 보유 수량을 확인한 뒤 정확한 숫자를 입력해 주세요.</p></div>
          {alreadySubmitted && submitOpen && (<div className="flex items-center gap-2 rounded-md bg-success-weak px-3 py-2 text-sm text-success-ink mb-4"><CheckCircle2 className="size-4 shrink-0" /><span>이번 주 입력 완료. 수정하려면 다시 저장하세요.</span></div>)}
          {!submitOpen && (<div className="rounded-md border border-border bg-inset px-4 py-5 text-center mb-4"><p className="text-sm font-medium text-primary">⏰ 현재 입력 기간이 아니에요</p><p className="mt-1 text-sm text-secondary">재화 입력은 <strong>매주 월요일 09:00 ~ 화요일 09:00</strong> 사이에만 가능해요.</p><p className="mt-2 text-xs text-secondary">다음 입력 가능: {nextOpen}</p></div>)}
          <form onSubmit={handleSubmit} className="space-y-4">
            {[{ key: "egg_shell", label: "알껍질 (K)", waiting: "egg_shell_waiting", placeholder: "예: 120K" }, { key: "spring", label: "태엽 (K)", waiting: "spring_waiting", placeholder: "예: 30K" }, { key: "skill_ticket", label: "스킬티켓 갯수 (K)", waiting: "skill_ticket_waiting", placeholder: "예: 12K" }].map(f => (
              <FormItem key={f.key} error={errors[f.key]}>
                <div className="flex items-center justify-between"><FormLabel>{f.label}</FormLabel><div className="flex items-center gap-1.5"><Checkbox id={f.waiting} checked={form[f.waiting]} onCheckedChange={v => setForm(prev => ({ ...prev, [f.waiting]: v === true }))} /><Label htmlFor={f.waiting} className="text-xs text-secondary cursor-pointer">승천 대기중</Label></div></div>
                <FormControl><Input type="number" min="0" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} /></FormControl>
                <FormMessage />
              </FormItem>
            ))}
            {[{ key: "egg_count", label: "알 갯수 (개)", placeholder: "예: 45" }, { key: "vehicle_count", label: "탈것 갯수 (개)", placeholder: "예: 5" }].map(f => (
              <FormItem key={f.key} error={errors[f.key]}><FormLabel>{f.label}</FormLabel><FormControl><Input type="number" min="0" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} /></FormControl><FormMessage /></FormItem>
            ))}
            <Button type="submit" variant="primary" className="w-full" isLoading={submitting} disabled={!submitOpen}>{alreadySubmitted ? "재화 수정 저장하기" : "재화 입력 완료하기"}</Button>
          </form>
        </Card>
        <div className="space-y-4">
          <Card><h3 className="text-base font-semibold mb-3">입력 안내</h3><div className="rounded-md border border-border bg-inset px-4 py-3 text-sm leading-relaxed text-secondary"><strong className="text-primary block mb-1">마감: 매주 일요일 23:59</strong>마감 전까지 입력을 완료해야 주간 클랜 보상 분배에 정상 반영됩니다.</div>{user && (<p className="mt-3 text-xs text-secondary">{memberInfo ? <><span className="text-primary font-medium">{memberInfo.nickname}</span> 님으로 입력돼요</> : <>로그인 계정: <span className="text-primary">{user.email}</span></>}</p>)}</Card>
          <section className="space-y-3"><h2 className="text-lg font-semibold">내 제출 이력</h2>{myHistory.length === 0 ? (<p className="text-sm text-secondary">아직 제출한 기록이 없어요.</p>) : (<div className="overflow-x-auto rounded-lg border border-border"><table className="w-full text-sm"><thead className="bg-inset"><tr>{["주차","알껍질","알","태엽","탈것","스킬티켓"].map(h => (<th key={h} className="px-3 py-2 text-left text-xs font-medium text-secondary">{h}</th>))}</tr></thead><tbody className="divide-y divide-border">{myHistory.slice(0, 8).map(r => (<tr key={r.id}><td className="px-3 py-2 font-medium">{r.week_label}</td><td className="px-3 py-2 text-secondary">{r.egg_shell}</td><td className="px-3 py-2 text-secondary">{r.egg_count}</td><td className="px-3 py-2 text-secondary">{r.spring}</td><td className="px-3 py-2 text-secondary">{r.vehicle_count}</td><td className="px-3 py-2 text-secondary">{r.skill_ticket}</td></tr>))}</tbody></table></div>)}</section>
        </div>
      </div>
    </div>
  );
}