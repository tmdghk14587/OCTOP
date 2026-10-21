import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home, BarChart2, Clock, Users, Swords, GitBranch } from "lucide-react";
import { Nav } from "./components/Nav";
import { Toaster } from "./components/Toast";
import MyResources from "./pages/MyResources";
import Overview from "./pages/Overview";
import History from "./pages/History";
import Members from "./pages/Members";
import ClanSkills from "./pages/ClanSkills";
import MySkillTree from "./pages/MySkillTree";

export default function App() {
  return (
    <BrowserRouter>
      <Nav
        items={[
          { href: "/", label: "내 재화 입력", icon: <Home /> },
          { href: "/my-skill-tree", label: "나의 기술트리", icon: <GitBranch /> },
          { href: "/overview", label: "클랜 현황", icon: <BarChart2 /> },
          { href: "/history", label: "주간 기록", icon: <Clock /> },
          { href: "/members", label: "클랜원 관리", icon: <Users /> },
          { href: "/clan-skills", label: "클랜 기술", icon: <Swords /> },
        ]}
      />
      <Toaster />
      <div className="mx-auto max-w-[1200px] px-4 pt-6 pb-8">
        <Routes>
          <Route path="/" element={<MyResources />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/history" element={<History />} />
          <Route path="/members" element={<Members />} />
          <Route path="/clan-skills" element={<ClanSkills />} />
          <Route path="/my-skill-tree" element={<MySkillTree />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}