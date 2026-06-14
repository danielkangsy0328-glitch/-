import React, { useState, useRef, useEffect } from "react";
import { MentoringSession, ChatMessage, SchoolTier, WrongAnswerData } from "../types";
import { SAMPLE_PROBLEMS, SampleProblem } from "../data";
import { BookOpen, Send, User, Award, HelpCircle, ArrowRight, Loader2, Sparkles, LogOut, CheckCircle, Camera, Image, X, Paperclip } from "lucide-react";

interface MentoringPanelProps {
  currentSession: MentoringSession | null;
  onStartSession: (gradeTier: SchoolTier, gradeDetail: string, title: string, desc: string, problemImgUrl?: string) => void;
  onSendMessage: (text: string, imageUrl?: string) => Promise<void>;
  onEndSession: () => void;
  onAddWrongRecord: (data: WrongAnswerData) => void;
}

export default function MentoringPanel({
  currentSession,
  onStartSession,
  onSendMessage,
  onEndSession,
  onAddWrongRecord
}: MentoringPanelProps) {
  // New session config state
  const [selectedTier, setSelectedTier] = useState<SchoolTier>(SchoolTier.MIDDLE);
  const [gradeDetail, setGradeDetail] = useState<string>("중학교 1학년");
  const [problemTitle, setProblemTitle] = useState<string>("");
  const [problemDescription, setProblemDescription] = useState<string>("");
  const [problemImage, setProblemImage] = useState<string | null>(null); // Initial problem photo base64
  const [chatImage, setChatImage] = useState<string | null>(null); // Interactive chat response photo base64
  const [userAgentHintSeen, setUserAgentHintSeen] = useState<boolean>(false); // placeholder if needed
  const [userInput, setUserInput] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [activeConfirmPopup, setActiveConfirmPopup] = useState<"wrap-up-or-exit" | "wrong-log" | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const problemFileRef = useRef<HTMLInputElement>(null);
  const chatFileRef = useRef<HTMLInputElement>(null);

  // Auto-scroll inside chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages, isSending]);

  // Auto-clear validation errors when user types or uploads something
  useEffect(() => {
    if (problemDescription.trim() || problemImage) {
      setValidationError(null);
    }
  }, [problemDescription, problemImage]);

  // Handle grade tier changed (set matching default detail)
  const handleTierChange = (tier: SchoolTier) => {
    setSelectedTier(tier);
    if (tier === SchoolTier.ELEMENTARY) {
      setGradeDetail("초등학교 3학년");
    } else if (tier === SchoolTier.MIDDLE) {
      setGradeDetail("중학교 2학년");
    } else {
      setGradeDetail("고등학교 1학년");
    }
    // Reset selections
    setProblemTitle("");
    setProblemDescription("");
  };

  // Helper chips based on grade tier
  const getHelperChips = () => {
    if (!currentSession) return [];
    if (currentSession.gradeTier === SchoolTier.ELEMENTARY) {
      return [
        "이해가 잘 안 돼요, 친절하게 도와주세요! 🍎",
        "힌트를 한 개만 부탁해요! ⭐",
        "이걸 손가락이나 바둑돌로 세어보면 어떻게 되나요?",
        "제 스스로 한 번 계산해 볼게요! 😆"
      ];
    } else if (currentSession.gradeTier === SchoolTier.MIDDLE) {
      return [
        "여기서 처음 세워야 하는 일차식이 헷갈려요.",
        "기하학적으로 원리를 보여주세요! 📐",
        "식을 여기까지 풀었는데 다음 단계 대입은 어떻게 하나요?",
        "정답을 구한 것 같아요! 맞춰볼까요?"
      ];
    } else {
      return [
        "이 정의의 기하학적 의미(그래프 해석)가 궁금합니다.",
        "혹시 미지수의 특수 범위(진수 조건 등)를 빠뜨렸나요? 🤔",
        "개념의 엄밀한 정의식을 다시 짚어주세요.",
        "메타인지 한 줄 요약을 완료했습니다!"
      ];
    }
  };

  // Custom inline LaTeX formatter
  const renderMathText = (rawText: string) => {
    if (!rawText) return "";

    // If the text contains a raw JSON block representing the logged wrong answer,
    // let's strip it from the display completely so the user sees no slop!
    let displayContent = rawText;
    const jsonRegex = /```json\s*(\{[\s\S]*?\})\s*```/;
    const match = displayContent.match(jsonRegex);
    if (match) {
      // Just strip the structured JSON from displaying in chat text bubbles for high-fidelity presentation
      displayContent = displayContent.replace(jsonRegex, "").trim();
    }

    // Splitting text by $...$ (LaTeX)
    const parts = displayContent.split(/(\$[^\$]+\$)/g);
    return (
      <span className="whitespace-pre-line leading-relaxed font-sans text-sm">
        {parts.map((part, index) => {
          if (part.startsWith("$") && part.endsWith("$")) {
            const mathExpression = part.slice(1, -1);
            return (
              <code
                key={index}
                className="mx-1 px-1.5 py-0.5 rounded font-mono font-medium text-purple-700 bg-purple-50 border border-purple-100 italic"
                style={{ fontSize: "0.95em" }}
              >
                {mathExpression}
              </code>
            );
          }
          return part;
        })}
      </span>
    );
  };

  // Base64 file reader helper
  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string | null) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle Form Submission of start mentoring
  const handleStart = () => {
    if (!problemDescription.trim() && !problemImage) {
      setValidationError("해결하고 싶은 수학 문제를 적거나 사진(카메라)으로 등록해 주세요!");
      return;
    }
    setValidationError(null);
    const finalTitle = problemTitle.trim() || `${gradeDetail} - 수학 해결 미션`;
    const finalDesc = problemDescription.trim() || "수험생이 첨부하여 제출한 문제 사진을 읽고, 절대로 정답이나 식을 바로 제공하지 말아주시고, 단계별 힌트Scaffolding 유도 규칙을 완수해 주세요.";
    onStartSession(selectedTier, gradeDetail, finalTitle, finalDesc, problemImage || undefined);
    
    // Clean states after creation
    setProblemImage(null);
  };

  // Select a predefined textbook template
  const handleSelectSample = (prob: SampleProblem) => {
    setProblemTitle(prob.problemTitle);
    setProblemDescription(prob.problemDescription);
    setProblemImage(null); // Clear image when custom text template selected
  };

  // Send message helper
  const handleSend = async () => {
    if (!userInput.trim() && !chatImage) return;
    if (isSending) return;

    const originalInput = userInput;
    const originalImage = chatImage;

    setUserInput("");
    setChatImage(null);
    setIsSending(true);

    try {
      const finalInputText = originalInput.trim() || "풀이 사진을 작성하여 첨부해 제출했습니다. 멘토님 확인해 주세요!";
      await onSendMessage(finalInputText, originalImage || undefined);
    } catch {
      // Recovery fallback in case of errors
      setUserInput(originalInput);
      setChatImage(originalImage);
    } finally {
      setIsSending(false);
    }
  };

  // Opens confirmation dialog
  const handleForceWrapUp = () => {
    setActiveConfirmPopup("wrap-up-or-exit");
  };

  // Executed when wrap-up was confirmed from our custom dialog
  const handleConfirmForceWrapUp = async () => {
    setActiveConfirmPopup(null);
    if (isSending) return;
    setIsSending(true);
    try {
      const forcedPrompt = 
        "[학습 수시 종료 및 최종 분석 요청]\n\n멘토님, 지금까지 나눈 저희 대화와 제가 식을 세워 푼 방식을 최종적으로 종합 분석해 주세요!\n1. 제가 어떤 부분에서 헷갈려하고 실수했는지 구체적인 원인 분석\n2. 이를 극복하기 위해 확실히 교과서에서 복습해야 하는 핵심 개념명 명시\n3. 앞으로의 공부 방향 처방전\n\n그리고, 최종 오답 저장을 위해 맨 밑줄에 [오답 창고 데이터 추출 규칙]에 따른 JSON 블록을 공백 문자 없이 완벽한 JSON 양식으로 무조건 포함하여 대답을 마쳐주세요! (예시: ```json {\"wrong_reason\": \"...\", \"core_concept\": \"...\", \"recommended_action\": \"...\"} ``` )";
      await onSendMessage(forcedPrompt, undefined);
    } catch (err) {
      console.error("Force wrap up request failed:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Executed when direct exiting was clicked on our custom dialog
  const handleConfirmDirectExit = () => {
    setActiveConfirmPopup(null);
    onEndSession();
  };

  // Opens confirmation dialog for immediate log
  const handleRequestWrongLog = () => {
    setActiveConfirmPopup("wrong-log");
  };

  // Executed when wrong logging was confirmed from our custom dialog
  const handleConfirmWrongLog = async () => {
    setActiveConfirmPopup(null);
    if (isSending) return;
    setIsSending(true);
    try {
      const logPrompt = 
        "[즉각 취약점 진단 및 오답 창고 기록 요청]\n\n멘토님, 현재 대화 흐름을 한 바퀴 검토하고, 제 연산/공식 적용/개념 유도 과정에 있었던 착오가 무엇인지 한눈에 알려주세요.\n동시에 대화 분석을 토대로 [오답 창고 데이터 추출 규칙]에 부합하는 JSON 코드블록을 출력 맨 뒷줄에 실어서 즉시 오답 분석이 완료되도록 유도해 주세요!";
      await onSendMessage(logPrompt, undefined);
    } catch (err) {
      console.error("Wrong answer record request failed:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleChipClick = (chipText: string) => {
    setUserInput(chipText);
  };

  return (
    <div className="w-full" id="mentoring-panel-container">
      {!currentSession ? (
        /* Configuration Stage */
        <div className="space-y-6" id="session-setup-form">
          <div className="border-b border-[#EBEAE4] pb-4" id="setup-header">
            <h2 className="text-xl font-bold font-sans text-[#2C2C2C] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#81B29A]" />
              수학 멘토와 1:1 맞춤형 멘토링 시작하기
            </h2>
            <p className="text-xs text-gray-500 mt-1 font-sans">
              학교급을 선택한 후 풀고 있는 문제를 상세히 적어주세요. 멘토가 여러분의 진정한 수학적 돌파구를 돕습니다.
            </p>
          </div>

          <div className="w-full font-sans text-left" id="setup-content">
            {/* Form configuration column */}
            <div className="w-full bg-white p-6 rounded-xl border border-[#EBEAE4] space-y-4" id="setup-main-controls">
              {/* Target School Tier Select */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#2C2C2C] uppercase tracking-wider block">
                  1. 학교급 선택
                </label>
                <div className="grid grid-cols-3 gap-2" id="school-tier-buttons">
                  {Object.values(SchoolTier).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => handleTierChange(tier)}
                      className={`py-3 px-2 rounded-lg border text-sm font-semibold transition ${
                        selectedTier === tier
                          ? "bg-[#2C2C2C] text-white border-transparent"
                          : "bg-[#FAF9F6] text-gray-600 border-[#EBEAE4] hover:bg-gray-50"
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exact grade details text */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#2C2C2C] block">
                  2. 상세 학년 및 반 (예: 초등학교 5학년 2학기, 고등학교 수학 II)
                </label>
                <input
                  type="text"
                  value={gradeDetail}
                  onChange={(e) => setGradeDetail(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-lg border border-[#EBEAE4] focus:outline-none focus:ring-1 focus:ring-[#81B29A] font-sans"
                  placeholder="예: 중학교 2학년, 고등학교 확률과 통계"
                />
              </div>

              {/* Problem Title */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#2C2C2C] block">
                  3. 문제 제목 (생략 가능)
                </label>
                <input
                  type="text"
                  value={problemTitle}
                  onChange={(e) => setProblemTitle(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-lg border border-[#EBEAE4] focus:outline-none focus:ring-1 focus:ring-[#81B29A] font-sans"
                  placeholder="예: 이차방정식 근 구하는 연습"
                />
              </div>

              {/* Problem description input area */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-[#2C2C2C] block">
                    4. 수학 문제 또는 학습 관련 질문 기술
                  </label>
                  <span className="text-[10px] text-gray-400 font-sans">사진 촬영만으로 해결 시작 가능! 📷</span>
                </div>
                <textarea
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 text-sm rounded-lg border border-[#EBEAE4] focus:outline-none focus:ring-1 focus:ring-[#81B29A] font-mono leading-relaxed"
                  placeholder="풀고 싶은 문제의 텍스트가 있다면 입력해 주세요. (또는 하단의 버튼으로 즉시 문제 사진을 촬영해 등록할 수도 있습니다!)"
                />

                {/* Problem Image Input Area */}
                <div className="pt-1">
                  <input
                    type="file"
                    ref={problemFileRef}
                    accept="image/*"
                    onChange={(e) => handleFileLoad(e, setProblemImage)}
                    className="hidden"
                  />
                  
                  {!problemImage ? (
                    <button
                      type="button"
                      onClick={() => problemFileRef.current?.click()}
                      className="w-full py-3 px-4 border border-dashed border-[#81B29A] rounded-xl bg-emerald-50/20 text-[#81B29A] hover:bg-emerald-50/50 transition flex items-center justify-center gap-2 text-xs font-bold"
                    >
                      <Camera className="w-4 h-4" />
                      스마트폰 카메라로 문제 사진 찍기 / 파일 올리기
                    </button>
                  ) : (
                    <div className="bg-[#FAF9F6] border border-[#EBEAE4] rounded-xl p-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={problemImage}
                          alt="등록할 문제 사진"
                          className="w-14 h-14 rounded object-cover border border-[#EBEAE4]"
                        />
                        <div>
                          <p className="text-xs font-bold text-gray-700">문제 사진이 정상적으로 준비되었습니다!</p>
                          <p className="text-[10px] text-gray-400 font-mono">가이드: 위 상세 학년을 마저 정하고 멘토링 시작을 해주세요.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProblemImage(null)}
                        className="bg-red-50 text-red-600 hover:bg-red-100 transition p-2 rounded-lg"
                        title="사진 지우기"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {validationError && (
                <div className="text-xs text-red-500 font-bold bg-red-50 border border-red-200 p-3 rounded-lg text-left" id="validation-error-display">
                  {validationError}
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleStart}
                className="w-full bg-[#E07A5F] hover:bg-[#c45a40] text-white py-3 px-6 rounded-lg transition font-bold text-sm flex items-center justify-center gap-2 shadow-sm"
                id="start-mentoring-action-btn"
              >
                <span>성장 멘토링 시작하기</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Active Chat Stage */
        <div className="space-y-4 relative" id="active-chat-stage">
          {/* Custom Safe Dialog Modal overlay for Scaffolding Actions (Iframe Resilient) */}
          {activeConfirmPopup && (
            <div className="absolute inset-0 bg-[#2C2C2C]/55 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 rounded-xl" id="custom-scaffold-dialog-overlay">
              <div className="bg-white rounded-2xl border border-[#EBEAE4] p-5 w-full max-w-xs shadow-xl text-left space-y-4 animate-fade-in animate-duration-200" id="dialog-innerbox">
                {activeConfirmPopup === "wrap-up-or-exit" ? (
                  <>
                    <div className="flex items-center gap-2 text-[#E07A5F]" id="diag-header-wu">
                      <LogOut className="w-5 h-5 shrink-0" />
                      <h4 className="font-extrabold text-sm text-[#2C2C2C] leading-none">수학 멘토링 세션 종료</h4>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-normal break-keep" id="diag-desc-wu">
                      수정 작업과 멘토링 종결을 청산하시겠습니까? 대화 기반의 **종합 피드백 결과서**를 수령하고 대화를 마칩니다. (수집 자료는 오답 창고로 연동됩니다)
                    </p>
                    <div className="space-y-1.5 pt-1 font-sans" id="diag-actions-wu">
                      <button
                        type="button"
                        onClick={handleConfirmForceWrapUp}
                        className="w-full py-2.5 px-3 bg-[#E07A5F] hover:bg-[#c45a40] text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1 shadow-sm"
                        id="dialog-btn-wrapup"
                      >
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        종료하고 피드백 받기 (권장)
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDirectExit}
                        className="w-full py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-[#2C2C2C] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                        id="dialog-btn-exit"
                      >
                        피드백 없이 대화 나가기
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveConfirmPopup(null)}
                        className="w-full py-2 text-gray-400 hover:text-gray-600 text-xs text-center transition font-semibold"
                        id="dialog-btn-cancel-wu"
                      >
                        돌아가기
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-[#81B29A]" id="diag-header-wl">
                      <Award className="w-5 h-5 shrink-0 text-[#81B29A]" />
                      <h4 className="font-extrabold text-sm text-[#2C2C2C] leading-none">오답 창고 즉시 등록</h4>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-normal break-keep" id="diag-desc-wl">
                      현재 단계까지 발생한 계산/부호/개념적 미비 원인을 멘토가 자동으로 추출하여 즉시 **오답 창고**에 저장하도록 요청하시겠습니까?
                    </p>
                    <div className="pt-2 flex flex-col gap-1.5 font-sans" id="diag-actions-wl">
                      <button
                        type="button"
                        onClick={handleConfirmWrongLog}
                        className="w-full py-2.5 px-3 bg-[#81B29A] hover:bg-[#6c9a82] text-white rounded-xl text-xs font-black transition text-center shadow-sm"
                        id="dialog-btn-wronglog"
                      >
                        네, 즉시 기록하기
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveConfirmPopup(null)}
                        className="w-full py-2.5 px-3 bg-[#FAF9F6] text-gray-500 hover:bg-gray-50 border border-[#EBEAE4] rounded-xl text-xs font-bold transition text-center"
                        id="dialog-btn-cancel-wl"
                      >
                        취소
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Active Session Status Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#F4F3EF] p-4 rounded-xl border border-[#EBEAE4]" id="chat-header">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono bg-[#EBEAE4] border border-[#DCDAD2] px-2 py-0.5 rounded font-bold text-gray-600">
                  {currentSession.gradeDetail}
                </span>
                <span className="text-xs font-bold text-[#81B29A]">실시간 밀착 지도 중</span>
              </div>
              <h3 className="text-sm font-bold text-[#2C2C2C] mt-1">
                {currentSession.problemTitle}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1 line-clamp-1 leading-snug font-sans">
                <strong>질문:</strong> {currentSession.problemDescription}
              </p>
              {currentSession.problemImageUrl && (
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-[10px] bg-white border border-[#EBEAE4] px-2 py-0.5 font-bold text-gray-600 rounded">첨부 문제 사진 📎</span>
                  <a href={currentSession.problemImageUrl} target="_blank" rel="noreferrer" className="text-[10px] text-[#E07A5F] hover:underline font-bold flex items-center gap-0.5">
                    새 탭에서 사진 원본 크게보기 🔍
                  </a>
                </div>
              )}
            </div>

            <button
              onClick={handleForceWrapUp}
              className="flex items-center gap-1.5 text-xs text-[#E07A5F] hover:text-[#c45a40] transition font-bold px-3 py-2 rounded-lg hover:bg-white/50 border border-transparent hover:border-[#EBEAE4] self-start md:self-auto shrink-0"
              id="exit-session-btn"
            >
              <LogOut className="w-3.5 h-3.5" />
              멘토링 종료
            </button>
          </div>

          {/* Scaffold Phase Indicator visual rail */}
          <div className="grid grid-cols-4 gap-2 bg-[#FAF9F6] border border-[#EBEAE4] rounded-lg p-2 text-xs font-sans text-center" id="scaffold-progress-bar">
            {[
              { label: "1. 탐구 시작", desc: "문제 이해", active: currentSession.messages.length >= 2 },
              { label: "2. 뼈대 유도", desc: "점진적 힌트", active: currentSession.messages.length >= 4 },
              { label: "3. 주체적 연산", desc: "스스로 풀기", active: currentSession.messages.length >= 6 },
              { label: "4. 메타인지", desc: "한 줄 요약", active: currentSession.messages.some(m => m.text.includes("요약") || m.text.includes("열쇠")) }
            ].map((step, idx) => (
              <div
                key={idx}
                className={`py-1 rounded transition ${
                  step.active
                    ? "bg-[#81B29A]/10 text-[#81B29A] font-bold border border-[#81B29A]/35"
                    : "text-gray-400"
                }`}
              >
                <div className="text-[10px] font-semibold leading-none">{step.label}</div>
                <div className="text-[9px] mt-0.5 opacity-80">{step.desc}</div>
              </div>
            ))}
          </div>

          {/* Chat scrolling log container */}
          <div className="border border-[#EBEAE4] rounded-2xl bg-white p-5 h-[420px] overflow-y-auto space-y-4" id="chat-messages-scrollable">
            {/* System welcome instructions */}
            <div className="flex justify-center p-2" id="system-welcome-bubble">
              <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3 max-w-lg text-center">
                <p className="text-[11px] text-amber-900 leading-normal">
                  💡 <strong>다온 멘토 가이드전:</strong> 멘토는 바로 정답을 알려주지 않고, 여러분이 원리를 스스로 발견할 수 있도록 응원 메시지와 간단한 단서를 순차적으로 줄 거예요! 긍정과 자신감으로 파이팅하세요!
                </p>
              </div>
            </div>

            {/* Dynamic Conversation Bubble */}
            {currentSession.messages.map((msg, index) => {
              if (msg.sender === "system") return null;
              const isUser = msg.sender === "user";

              // Clean text check for our UI presentation - hide structural JSON
              const textToRender = msg.text;
              const hasJson = textToRender.includes("wrong_reason") && textToRender.includes("core_concept");

              return (
                <div
                  key={msg.id || index}
                  className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto text-left"}`}
                  id={`chat-msg-${msg.id || index}`}
                >
                  {/* Avatar Icons */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isUser ? "bg-[#2C2C2C] text-white" : "bg-[#FAF9F6] border border-[#EBEAE4] text-[#81B29A]"
                  }`}>
                    {isUser ? <User className="w-4 h-4" /> : <Award className="w-4 h-4" />}
                  </div>

                  <div className="space-y-1">
                    {/* Time or Sender title if needed */}
                    <div className={`text-[10px] text-gray-400 font-sans ${isUser ? "text-right" : "text-left"}`}>
                      {isUser ? "수험생" : "맞춤형 멘토"}
                    </div>

                    {/* Chat Bubble Body content */}
                    <div className={`p-4 rounded-2xl border text-sm ${
                      isUser
                        ? "bg-[#FAF9F6] border-[#EBEAE4] text-[#2C2C2C] rounded-tr-none"
                        : "bg-white border-[#EBEAE4] text-gray-800 rounded-tl-none shadow-sm"
                    }`}>
                      {msg.imageUrl && (
                        <div className="mb-2.5 max-w-full overflow-hidden rounded-xl border border-[#EBEAE4] bg-[#FAF9F6] p-1 shadow-inner">
                          <img
                            src={msg.imageUrl}
                            alt="제출된 풀이"
                            className="max-h-60 w-auto rounded-lg object-contain mx-auto"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      
                      {renderMathText(textToRender)}

                      {/* Silent marker for autologger detection */}
                      {hasJson && (
                        <div className="mt-3 pt-2.5 border-t border-emerald-100 text-[11px] text-emerald-800 font-sans flex items-center gap-1.5 bg-emerald-50/50 p-2 rounded-lg">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>메타인지가 성공적으로 완수되어, 오답 분석 정보가 창고에 축적되었습니다!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Mentor typing stream loader */}
            {isSending && (
              <div className="flex gap-3 mr-auto items-center text-gray-400 text-xs py-2" id="mentor-thinking-indicator">
                <div className="w-8 h-8 rounded-full bg-[#FAF9F6] border border-[#EBEAE4] text-[#81B29A] flex items-center justify-center shrink-0">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <span>멘토가 질문을 꼼꼼하게 읽고 수학적 길잡이를 생각하는 중입니다...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Action trigger bar for AI Assessment & Terminating */}
          <div className="grid grid-cols-2 gap-2" id="ai-assessment-triggers">
            <button
              type="button"
              onClick={handleForceWrapUp}
              disabled={isSending}
              className="py-2.5 px-3 bg-red-50 hover:bg-red-100/80 border border-red-200 text-red-700 text-[10.5px] font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              title="세션을 종합 요약하고 오답 창고로 전송하며 멘토링을 깔끔하게 종결합니다."
            >
              <LogOut className="w-3.5 h-3.5" />
              멘토 종료 & 피드백 받기
            </button>
            <button
              type="button"
              onClick={handleRequestWrongLog}
              disabled={isSending}
              className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-[10.5px] font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              title="현재까지 질문 중 발견한 나의 취약점을 즉시 오답 노드로 가공해 창고에 적재시킵니다."
            >
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              오답 즉시 등록 요청
            </button>
          </div>

          {/* Chat image preview if attached */}
          {chatImage && (
            <div className="flex items-center gap-2.5 bg-emerald-50/15 border border-[#81B29A]/30 p-2.5 rounded-xl self-start max-w-sm animate-fade-in" id="chat-attached-preview">
              <img
                src={chatImage}
                alt="첨부된 풀이"
                className="w-11 h-11 rounded object-cover border border-[#EBEAE4]"
              />
              <div className="text-left">
                <p className="text-[11px] font-bold text-gray-700 leading-normal">답안 풀이 사진이 첨부되었습니다!</p>
                <p className="text-[10px] text-gray-400 font-sans leading-none">전송 버튼이나 엔터를 누르면 제출됩니다.</p>
              </div>
              <button
                type="button"
                onClick={() => setChatImage(null)}
                className="bg-red-50 text-red-600 hover:bg-red-100 transition p-1.5 rounded-lg ml-2"
                title="사진 취소"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Suggested helper quick reply chips */}
          <div className="flex flex-wrap gap-2 py-1" id="quick-reply-chips">
            {getHelperChips().map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipClick(chip)}
                className="text-xs bg-white text-[#2C2C2C] hover:bg-[#FAF9F6] hover:border-[#81B29A] transition px-3 py-1.5 rounded-full border border-[#EBEAE4]"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Reply submission Form Control - Mobile First Optimized Layout */}
          <div className="flex gap-2" id="chat-input-controls">
            <input
              type="file"
              ref={chatFileRef}
              accept="image/*"
              onChange={(e) => handleFileLoad(e, setChatImage)}
              className="hidden"
            />
            
            <button
              type="button"
              onClick={() => chatFileRef.current?.click()}
              className={`p-3.5 rounded-xl border border-[#EBEAE4] bg-white text-gray-600 hover:bg-[#FAF9F6] hover:text-[#81B29A] transition flex items-center justify-center shrink-0 ${
                chatImage ? "text-[#81B29A] border-[#81B29A]/50 bg-emerald-50/10" : ""
              }`}
              title="카메라 촬영 또는 답안 풀이 사진 추가"
            >
              <Camera className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 px-4 py-3 text-sm rounded-xl border border-[#EBEAE4] focus:outline-none focus:ring-1 focus:ring-[#81B29A] bg-white font-sans text-gray-800 shadow-sm"
              placeholder={chatImage ? "풀이 사진에 부연 묘사를 쓰거나 전송 버튼 클릭..." : "수학 멘토와 대화를 나누어 정답을 유도해 보세요!"}
              disabled={isSending}
              id="student-text-input"
            />
            
            <button
              onClick={handleSend}
              disabled={isSending || (!userInput.trim() && !chatImage)}
              className="bg-[#2C2C2C] hover:bg-black disabled:bg-gray-300 text-white rounded-xl px-5 transition flex items-center justify-center shadow-sm shrink-0"
              title="메시지를 멘토에게 전송합니다."
              id="send-message-btn"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
