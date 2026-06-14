import { useState, useEffect, FormEvent } from "react";
import { MentoringSession, ChatMessage, WrongAnswerRecord, SchoolTier, WrongAnswerData, AppUser } from "./types";
import MentoringPanel from "./components/MentoringPanel";
import WrongAnswerWarehouse from "./components/WrongAnswerWarehouse";
import HistoryRoom from "./components/HistoryRoom";
import { BookOpen, Award, CheckCircle, GraduationCap, AlertCircle, RefreshCw, Clock, User, LogOut, Key, Smile } from "lucide-react";

// Highly resilient helper to parse any JSON out of general text
function extractWrongAnswerFromText(text: string): WrongAnswerData | null {
  if (!text) return null;
  
  // 1. Try md json block format
  const mdRegex = /```json\s*(\{[\s\S]*?\})\s*```/i;
  const match = text.match(mdRegex);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.wrong_reason && parsed.core_concept) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  // 2. Try raw braces lookup containing 'wrong_reason'
  const bracketIndex = text.indexOf("{");
  if (bracketIndex !== -1) {
    const lastCurly = text.lastIndexOf("}");
    if (lastCurly > bracketIndex) {
      try {
        const potentialJson = text.substring(bracketIndex, lastCurly + 1);
        const cleaned = potentialJson.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.wrong_reason && parsed.core_concept) {
          return parsed;
        }
      } catch {
        // ignore
      }
    }
  }
  
  // 3. Fallback regex finder
  try {
    const reasonMatch = text.match(/"wrong_reason"\s*:\s*"([^"]+)"/);
    const conceptMatch = text.match(/"core_concept"\s*:\s*"([^"]+)"/);
    const actionMatch = text.match(/"recommended_action"\s*:\s*"([^"]+)"/);
    
    if (reasonMatch && conceptMatch) {
      return {
        wrong_reason: reasonMatch[1],
        core_concept: conceptMatch[1],
        recommended_action: actionMatch ? actionMatch[1] : "오개념 중심 개념서 정독 및 관련 기본 문제 연습"
      };
    }
  } catch (e) {
    console.error("Regex backup parsing failed:", e);
  }
  
  return null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"chat" | "history" | "warehouse">("chat");

  // Auth States
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem("daon_math_active_user") || null;
  });

  const [users, setUsers] = useState<AppUser[]>(() => {
    const cached = localStorage.getItem("daon_math_users");
    return cached ? JSON.parse(cached) : [];
  });

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  // Client-side local persistence storage state scoped to the logged-in user
  const [sessions, setSessions] = useState<MentoringSession[]>([]);
  const [wrongAnswerRecords, setWrongAnswerRecords] = useState<WrongAnswerRecord[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Highlight notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "info" | "error">("success");

  // Load user data upon login state change
  useEffect(() => {
    if (currentUser) {
      const uSessions = localStorage.getItem(`daon_math_sessions_${currentUser}`);
      const uRecords = localStorage.getItem(`daon_math_wrong_records_${currentUser}`);
      const uSessionId = localStorage.getItem(`daon_math_current_session_id_${currentUser}`);

      setSessions(uSessions ? JSON.parse(uSessions) : []);
      setWrongAnswerRecords(uRecords ? JSON.parse(uRecords) : []);
      setCurrentSessionId(uSessionId || null);
    } else {
      setSessions([]);
      setWrongAnswerRecords([]);
      setCurrentSessionId(null);
    }
  }, [currentUser]);

  // Sync user data back whenever state changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`daon_math_sessions_${currentUser}`, JSON.stringify(sessions));
    }
  }, [sessions, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`daon_math_wrong_records_${currentUser}`, JSON.stringify(wrongAnswerRecords));
    }
  }, [wrongAnswerRecords, currentUser]);

  useEffect(() => {
    if (currentUser) {
      if (currentSessionId) {
        localStorage.setItem(`daon_math_current_session_id_${currentUser}`, currentSessionId);
      } else {
        localStorage.removeItem(`daon_math_current_session_id_${currentUser}`);
      }
    }
  }, [currentSessionId, currentUser]);

  // Handle users list save
  useEffect(() => {
    localStorage.setItem("daon_math_users", JSON.stringify(users));
  }, [users]);

  const triggerToast = (message: string, type: "success" | "info" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Find currently active session object
  const currentSession = sessions.find((s) => s.id === currentSessionId) || null;

  // 0. Authentication Actions Handlers
  const handleAuthSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedUsername = authUsername.trim();
    if (!trimmedUsername || !authPassword) {
      triggerToast("이름과 비밀번호를 모두 입력해 주세요.", "error");
      return;
    }

    if (authMode === "register") {
      const exists = users.some(u => u.username.toLowerCase() === trimmedUsername.toLowerCase());
      if (exists) {
        triggerToast("이미 사용 중인 이름입니다. 해당 이름으로 로그인하거나 다른 이름을 기재해 주세요.", "error");
        return;
      }

      const newUser: AppUser = {
        username: trimmedUsername,
        passwordHash: authPassword,
        createdAt: new Date().toISOString()
      };

      // Auto migrate unauthenticated logs if modern kids transition
      const legacySessions = localStorage.getItem("daon_math_sessions");
      const legacyRecords = localStorage.getItem("daon_math_wrong_records");
      const legacySessionId = localStorage.getItem("daon_math_current_session_id");

      if (legacySessions || legacyRecords) {
        if (legacySessions) {
          localStorage.setItem(`daon_math_sessions_${trimmedUsername}`, legacySessions);
          localStorage.removeItem("daon_math_sessions");
        }
        if (legacyRecords) {
          localStorage.setItem(`daon_math_wrong_records_${trimmedUsername}`, legacyRecords);
          localStorage.removeItem("daon_math_wrong_records");
        }
        if (legacySessionId) {
          localStorage.setItem(`daon_math_current_session_id_${trimmedUsername}`, legacySessionId);
          localStorage.removeItem("daon_math_current_session_id");
        }
        triggerToast(`환영합니다, ${trimmedUsername}님! 기존 학습 세션 및 오답 가공이 안전하게 승계되었습니다. 🎉`, "success");
      } else {
        triggerToast(`환영합니다, ${trimmedUsername}님! 안전한 수학 공부방 계정이 생성되었습니다. 🎉`, "success");
      }

      setUsers(prev => [...prev, newUser]);
      setCurrentUser(trimmedUsername);
      localStorage.setItem("daon_math_active_user", trimmedUsername);

      setAuthUsername("");
      setAuthPassword("");
    } else {
      const matched = users.find(u => u.username.toLowerCase() === trimmedUsername.toLowerCase() && u.passwordHash === authPassword);
      if (matched) {
        setCurrentUser(matched.username);
        localStorage.setItem("daon_math_active_user", matched.username);
        triggerToast(`${matched.username}님, 환영합니다! 오늘 수학도 차근차근 다 정복해 봅시다! ✨`, "success");
        setAuthUsername("");
        setAuthPassword("");
      } else {
        triggerToast("이름이 올바르지 않거나 비밀번호가 틀렸습니다.", "error");
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("daon_math_active_user");
    triggerToast("공부방에서 안전하게 로그아웃 되었습니다.", "info");
  };

  // 1. Session Setup Action Handler
  const handleStartSession = (
    gradeTier: SchoolTier,
    gradeDetail: string,
    title: string,
    description: string,
    problemImageUrl?: string
  ) => {
    const newSessionId = `session_${Date.now()}`;
    const newSession: MentoringSession = {
      id: newSessionId,
      gradeTier,
      gradeDetail,
      problemTitle: title,
      problemDescription: description,
      problemImageUrl,
      messages: [
        {
          id: `welcome_${Date.now()}`,
          sender: "mentor",
          text: problemImageUrl 
            ? `안녕하세요! 😊 ${gradeDetail} 수학 멘토입니다.\n제출해주신 **[수학 문제 사진]**을 꼼꼼히 확인했습니다!\n\n${description}\n\n문제를 해결하기 위해 어떤 생각이나 식을 처음 떠올렸는지 간단히 가르쳐주세요. 천천히 대화를 시작해 볼까요?`
            : `안녕하세요! 😊 ${gradeDetail} 수학 멘토입니다.\n오늘 함께 정복해보려는 문제는 **[${title}]** 이군요!\n\n문제를 해결하기 위해 어떤 생각이나 식을 처음 떠올렸는지 간단히 가르쳐주세요. 천천히 대화를 시작해 볼까요?`,
          timestamp: new Date().toISOString()
        }
      ],
      status: "active",
      createdAt: new Date().toISOString(),
      wrongAnswerLogged: false
    };

    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSessionId);
    triggerToast(`[${title}] 학습 세션이 활성화되었습니다. 집중해서 임해 보세요! ✍️`, "success");
  };

  // 2. Chat Processing Action Handler
  const handleSendMessage = async (text: string, imageUrl?: string) => {
    if (!currentSession) return;

    // A. Add user message
    const userMsg: ChatMessage = {
      id: `student_${Date.now()}`,
      sender: "user",
      text,
      imageUrl,
      timestamp: new Date().toISOString()
    };

    const updatedSessionMessages = [...currentSession.messages, userMsg];

    // Optimistically update inside state tree
    setSessions((prev) =>
      prev.map((s) => (s.id === currentSession.id ? { ...s, messages: updatedSessionMessages } : s))
    );

    try {
      // B. Fetch next scaffolding step from our Node Express proxy server
      const res = await fetch("/api/mentor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gradeTier: currentSession.gradeTier,
          gradeDetail: currentSession.gradeDetail,
          problemDescription: currentSession.problemDescription,
          problemImageUrl: currentSession.problemImageUrl,
          messages: updatedSessionMessages
        })
      });

      if (!res.ok) {
        throw new Error("서버로부터 멘토의 응답을 받아오지 못했습니다.");
      }

      const data = await res.json();
      const mentorText = data.text;

      // C. Intercept responses to extract active WrongAnswerData using our highly resilient helper
      const parsedWrong = extractWrongAnswerFromText(mentorText);

      // D. Wrap it up and append mentor answer
      const mentorMsg: ChatMessage = {
        id: `mentor_${Date.now()}`,
        sender: "mentor",
        text: mentorText,
        timestamp: new Date().toISOString(),
        hasWrongData: !!parsedWrong
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === currentSession.id) {
            const hasWrongNow = s.wrongAnswerLogged || !!parsedWrong;
            // Transition status to completed if metacognition summary wraps up with JSON metadata,
            // or if the user explicitly requested a summary session ending.
            const isFinishedPrompt = text.includes("[학습 수시 종료 및 최종 분석 요청]");
            const finalStatus = (parsedWrong || isFinishedPrompt) ? "completed" : s.status;
            return {
              ...s,
              messages: [...updatedSessionMessages, mentorMsg],
              status: finalStatus,
              wrongAnswerLogged: hasWrongNow
            };
          }
          return s;
        })
      );

      // E. Add to local wrong answers DB if present
      if (parsedWrong) {
        handleAddWrongRecord({
          wrong_reason: parsedWrong.wrong_reason,
          core_concept: parsedWrong.core_concept,
          recommended_action: parsedWrong.recommended_action
        });

        // If this session was a Re-challenge equivalent problem, let's mark original as solved!
        if (currentSession.problemTitle.startsWith("🎯 [오답 극복]")) {
          // Find original tag concept and mark as solved
          setWrongAnswerRecords(prev =>
            prev.map(rec =>
              currentSession.problemTitle.includes(rec.core_concept)
                ? { ...rec, solvedEquivalent: true }
                : rec
            )
          );
          triggerToast(" 축하합니다! 유사 오답을 풀어내 핵심 개념 정복 마크를 획득하셨습니다!", "success");
        }
      }

    } catch (err: any) {
      triggerToast(err.message || "오류가 발생했습니다. 네트워크 연결을 재시도해 주세요.", "error");
      throw err;
    }
  };

  // 3. Log Wrong Answer Internally
  const handleAddWrongRecord = (data: WrongAnswerData) => {
    if (!currentSession) return;

    // Avoid double logging for exactly same concept of the sessionId
    const isDuplicate = wrongAnswerRecords.some(
      (r) => r.core_concept === data.core_concept && r.problemText === currentSession.problemDescription
    );

    if (isDuplicate) return;

    const newRecord: WrongAnswerRecord = {
      id: `wrong_${Date.now()}`,
      gradeTier: currentSession.gradeTier,
      gradeDetail: currentSession.gradeDetail,
      problemText: currentSession.problemDescription,
      wrong_reason: data.wrong_reason,
      core_concept: data.core_concept,
      recommended_action: data.recommended_action,
      createdAt: new Date().toISOString(),
      solvedEquivalent: false
    };

    setWrongAnswerRecords((prev) => [newRecord, ...prev]);
    triggerToast(
      "📝 방금 전 대화에서 도출된 취약점 분석 정보가 '오답 창고'에 안전하게 축적되었습니다!",
      "info"
    );
  };

  // 4. Terminate Current Active Session
  const handleEndSession = () => {
    if (!currentSessionId) return;
    setCurrentSessionId(null);
    triggerToast("학습 세션이 종료되었습니다. 수고 많으셨습니다! 😊", "info");
  };

  // 5. Clear All Stored Warehouse Records
  const handleClearRecords = () => {
    setWrongAnswerRecords([]);
    triggerToast("오답 창고가 완벽히 포맷되었습니다.", "info");
  };

  // 6. Action: Challenge tailored equivalent problem based on logged mistake
  const handleSelectChallenge = async (record: WrongAnswerRecord) => {
    triggerToast("인공지능 수학 교사가 극복 처방전을 정성스럽게 집필하는 중입니다... 잠시만 기다려주세요. ⏳", "info");

    try {
      const res = await fetch("/api/mentor/generate-equivalent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gradeTier: record.gradeTier,
          gradeDetail: record.gradeDetail,
          wrongReason: record.wrong_reason,
          coreConcept: record.core_concept,
          originalProblem: record.problemText
        })
      });

      if (!res.ok) {
        throw new Error("처방 유사문제를 가공하는 도중 서버 오류가 터졌습니다.");
      }

      const prescription = await res.json();

      // Automatically construct custom re-challenge session
      const equivalentSessionId = `equiv_${Date.now()}`;
      const newSession: MentoringSession = {
        id: equivalentSessionId,
        gradeTier: record.gradeTier,
        gradeDetail: record.gradeDetail,
        problemTitle: `🎯 [오답 극복] ${record.core_concept}`,
        problemDescription: prescription.problemDescription,
        messages: [
          {
            id: `equiv_welcome_${Date.now()}`,
            sender: "mentor",
            text: `${record.gradeDetail} 친구 반가워요! 이번 도전은 이전에 조금 헷갈려했던 **[${record.core_concept}]** 개념을 확실히 복덩이로 만드는 정복 문제예요! ✨\n\n📌 **오답 처방 문제:**\n${prescription.problemDescription}\n\n${prescription.mentorIntro}\n\n첫 수식을 세워보거나 간단한 생각을 대답해 볼까요? 멘토가 한 줄 힌트로 바로 이끌어 줄게요!`,
            timestamp: new Date().toISOString()
          }
        ],
        status: "active",
        createdAt: new Date().toISOString(),
        wrongAnswerLogged: false
      };

      setSessions((prev) => [newSession, ...prev]);
      setCurrentSessionId(equivalentSessionId);
      setActiveTab("chat");
      triggerToast(`'${record.core_concept}' 오답을 격파하기 위한 처방전 세션이 연동되었습니다!`, "success");
    } catch (err: any) {
      triggerToast(err.message || "오답 처방 연동에 실패했습니다.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#ECEAE0] text-[#2C2C2C] font-sans antialiased md:py-8 flex flex-col justify-center items-center" id="app-root">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-md border flex items-center gap-2 max-w-[365px] w-[90%] animate-fade-in text-xs font-semibold ${
            toastType === "success"
              ? "bg-[#E6F4EA] border-[#B7E1CD] text-[#137333]"
              : toastType === "error"
              ? "bg-[#FCE8E6] border-[#F1B3B0] text-[#C5221F]"
              : "bg-[#E8F0FE] border-[#D2E3FC] text-[#1A73E8]"
          }`}
          id="toast-notification-banner"
         >
          {toastType === "success" ? (
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          ) : toastType === "error" ? (
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
          )}
          <span className="leading-tight">{toastMessage}</span>
        </div>
      )}

      {/* 완벽한 학습 전용 크기의 스마트 크기 직사각형 레이아웃 (더 넓은 가로폭으로 가독성과 사용성을 극대화한 구조) */}
      <div 
        className="w-full max-w-[430px] md:h-[840px] md:rounded-3xl md:border-8 md:border-gray-800 md:shadow-2xl bg-[#FAF9F6] relative overflow-hidden flex flex-col border-gray-800" 
        id="phone-device-wrapper"
        style={{ height: '100vh', maxHeight: '100vh' }}
      >
        {/* 상단 액티브 디자인 데코 바 */}
        <div className="hidden md:block h-2 bg-gray-800 w-full shrink-0"></div>

        {!currentUser ? (
          /* Custom App-Auth Login and Register Box */
          <div className="flex-1 flex flex-col justify-center items-center p-6 bg-[#FAF9F6] overflow-y-auto" id="auth-form-container">
            <div className="w-full max-w-sm space-y-6 text-center" id="auth-form-card">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-[#2C2C2C] text-white rounded-2xl flex items-center justify-center font-black shadow-md" id="logo-icon-large">
                  <GraduationCap className="w-7 h-7 text-[#81B29A]" />
                </div>
                <div>
                  <h1 className="text-base font-black tracking-tight text-[#2C2C2C] leading-none">
                    다온 수학 멘토
                  </h1>
                  <p className="text-[9px] text-[#81B29A] font-bold font-mono tracking-wider mt-1.5">
                    SCAFFOLDING TUTOR
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#EBEAE4] px-4 py-3.5 rounded-xl text-left shadow-sm" id="auth-welcome-note">
                <p className="text-[11px] text-gray-600 leading-relaxed break-keep">
                  <Smile className="w-4 h-4 inline text-[#81B29A] mr-1 align-sub" />
                  <strong>나만의 맞춤형 수학 공부방</strong><br />
                  구글 계정을 연결할 필요 없이, 사용할 <strong>이름(아이디)</strong>과 <strong>비밀번호</strong>만 정하면 즉시 나만의 맞춤 오답 창고와 메타인지 멘토링 방이 개설됩니다!
                </p>
              </div>

              {/* Form Mode Tabs */}
              <div className="flex p-0.5 bg-gray-200/60 rounded-xl" id="auth-mode-tabs">
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition duration-200 ${
                    authMode === "login" ? "bg-white text-[#2C2C2C] shadow" : "text-gray-400 hover:text-gray-500"
                  }`}
                >
                  공부방 입장 (로그인)
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("register")}
                  className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition duration-200 ${
                    authMode === "register" ? "bg-white text-[#2C2C2C] shadow" : "text-gray-400 hover:text-gray-500"
                  }`}
                >
                  공부방 개설 (회원등록)
                </button>
              </div>

              {/* Main Submit Form */}
              <form onSubmit={handleAuthSubmit} className="space-y-4 text-left" id="auth-identity-form">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                    <User className="w-3 h-3 text-gray-400" />
                    나의 이름 (아이디)
                  </label>
                  <input
                    type="text"
                    required
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    placeholder="예: 홍길동, math_master"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#EBEAE4] bg-white focus:outline-none focus:ring-1 focus:ring-[#81B29A] transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                    <Key className="w-3 h-3 text-gray-400" />
                    공부방 패스워드
                  </label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#EBEAE4] bg-white focus:outline-none focus:ring-1 focus:ring-[#81B29A] transition"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#2C2C2C] hover:bg-[#1A1A1A] text-white rounded-xl text-xs font-black shadow-sm transition active:scale-[0.98] mt-2"
                >
                  {authMode === "login" ? "공부방 안전하게 입장하기 🚪" : "나만의 공부방 등록하고 공부 시작 🚀"}
                </button>
              </form>

              <div className="pt-2 text-[9px] text-gray-400 font-sans tracking-tight break-keep" id="auth-disclaimer">
                개인화 데이터는 브라우저 내부 스토리지에 사용자별로 정확히 영역이 구분되어 로컬 영구저장됩니다.
              </div>
            </div>
          </div>
        ) : (
          /* Authenticated Dashboard Panel */
          <>
            {/* Hero Header Area Panel */}
            <header className="bg-white border-b border-[#EBEAE4] sticky top-0 z-40 px-3.5 h-14 flex items-center justify-between shrink-0" id="main-navigation-bar">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#2C2C2C] text-white rounded-lg flex items-center justify-center font-black" id="logo-icon">
                  <GraduationCap className="w-4.5 h-4.5 text-[#81B29A]" />
                </div>
                <div>
                  <h1 className="text-xs font-extrabold tracking-tight text-[#2C2C2C] leading-none flex items-center gap-1">
                    <span className="text-[#81B29A]">{currentUser}</span>의 공부방
                  </h1>
                  <p className="text-[8px] text-gray-400 font-bold font-mono tracking-wider mt-0.5">
                    DAON S-TUTOR
                  </p>
                </div>
              </div>

              {/* Navigation Action tabs & SignOut icon */}
              <div className="flex items-center gap-1" id="nav-and-signout-wrapper">
                <nav className="flex items-center gap-0.5 shrink-0" id="nav-tabs">
                  <button
                    onClick={() => setActiveTab("chat")}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center gap-0.5 border whitespace-nowrap shrink-0 ${
                      activeTab === "chat"
                        ? "bg-[#FAF9F6] border-[#EBEAE4] text-[#2C2C2C] font-extrabold"
                        : "bg-transparent border-transparent text-gray-400 hover:text-[#2C2C2C]"
                    }`}
                    id="chat-tab-trigger"
                  >
                    <BookOpen className="w-3 h-3 shrink-0" />
                    <span className="whitespace-nowrap">멘토링</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("history")}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center gap-0.5 border whitespace-nowrap shrink-0 ${
                      activeTab === "history"
                        ? "bg-[#FAF9F6] border-[#EBEAE4] text-[#2C2C2C] font-extrabold"
                        : "bg-transparent border-transparent text-gray-400 hover:text-[#2C2C2C]"
                    }`}
                    id="history-tab-trigger"
                  >
                    <Clock className="w-3 h-3 shrink-0" />
                    <span className="whitespace-nowrap">기록방</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("warehouse")}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center gap-0.5 border relative whitespace-nowrap shrink-0 ${
                      activeTab === "warehouse"
                        ? "bg-[#FAF9F6] border-[#EBEAE4] text-[#2C2C2C] font-extrabold"
                        : "bg-transparent border-transparent text-gray-400 hover:text-[#2C2C2C]"
                    }`}
                    id="warehouse-tab-trigger"
                  >
                    <Award className="w-3 h-3 shrink-0" />
                    <span className="whitespace-nowrap">오답 창고</span>
                    {wrongAnswerRecords.filter(r => !r.solvedEquivalent).length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-[#E07A5F] text-white font-mono font-bold text-[8px] px-1 rounded-full aspect-square min-w-3.5 flex items-center justify-center animate-pulse">
                        {wrongAnswerRecords.filter(r => !r.solvedEquivalent).length}
                      </span>
                    )}
                  </button>
                </nav>

                <button
                  onClick={handleLogout}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="공부방 로그아웃"
                  id="app-logout-btn"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </header>

            {/* Main Content Area: 모바일 최적 규격 스크롤 구조 */}
            <main className="flex-1 overflow-y-auto p-4 flex flex-col bg-white" id="main-content-canvas">
              {/* Active Tab Container */}
              <div className="flex-1 flex flex-col" id="active-panel-holder">
                {activeTab === "chat" ? (
                  <MentoringPanel
                    currentSession={currentSession}
                    onStartSession={handleStartSession}
                    onSendMessage={handleSendMessage}
                    onEndSession={handleEndSession}
                    onAddWrongRecord={handleAddWrongRecord}
                  />
                ) : activeTab === "history" ? (
                  <HistoryRoom
                    sessions={sessions}
                    currentSessionId={currentSessionId}
                    onSelectSession={(sessionId) => {
                      setCurrentSessionId(sessionId);
                      setActiveTab("chat");
                      triggerToast("이전 대화가 활성화되었습니다! 💬", "success");
                    }}
                    onDeleteSession={(sessionId) => {
                      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
                      if (currentSessionId === sessionId) {
                        setCurrentSessionId(null);
                      }
                      triggerToast("학습 세션이 삭제되었습니다.", "info");
                    }}
                  />
                ) : (
                  <WrongAnswerWarehouse
                    records={wrongAnswerRecords}
                    onClearRecords={handleClearRecords}
                    onSelectChallenge={handleSelectChallenge}
                  />
                )}
              </div>
            </main>
          </>
        )}
      </div>
    </div>
  );
}
