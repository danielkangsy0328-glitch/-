import React from "react";
import { MentoringSession } from "../types";
import { MessageSquare, Trash2, Play, CheckCircle, Clock, BookOpen, AlertCircle } from "lucide-react";

interface HistoryRoomProps {
  sessions: MentoringSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

export default function HistoryRoom({
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
}: HistoryRoomProps) {
  const activeSessions = sessions.filter((s) => s.status === "active");
  const completedSessions = sessions.filter((s) => s.status === "completed" || s.status === "metacognition");

  return (
    <div className="flex flex-col h-full space-y-4 font-sans text-left" id="history-room-root">
      {/* Overview stats layout */}
      <div className="bg-[#F4F3EF] border border-[#EBEAE4] rounded-xl p-3.5 grid grid-cols-3 gap-2" id="history-stats-panel">
        <div className="text-center">
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">전체 세션</p>
          <p className="text-sm font-black text-gray-800 mt-0.5">{sessions.length}개</p>
        </div>
        <div className="text-center border-l border-r border-[#DCDAD2]">
          <p className="text-[9px] text-[#81B29A] font-bold uppercase tracking-wider">진행 중</p>
          <p className="text-sm font-black text-[#81B29A] mt-0.5">{activeSessions.length}개</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-[#E07A5F] font-bold uppercase tracking-wider">정복 완료</p>
          <p className="text-sm font-black text-[#E07A5F] mt-0.5">{completedSessions.length}개</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0" id="sessions-history-list">
        <h3 className="text-xs font-bold text-[#2C2C2C] mb-2.5 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#81B29A]" />
          과거 1:1 수학 멘토링 기록
        </h3>

        {sessions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[#EBEAE4] rounded-2xl p-6 text-center text-gray-400 bg-white" id="no-history-state">
            <MessageSquare className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-xs font-bold">진행된 멘토링 이력이 없습니다.</p>
            <p className="text-[10px] text-gray-400 mt-1">첫 번째 멘토링을 시작해서 수학의 핵심 열쇠들을 모아보세요!</p>
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto pr-1 flex-1 pb-6" style={{ maxHeight: "calc(100vh - 280px)" }} id="history-scroller">
            {sessions.map((session) => {
              const isActive = session.id === currentSessionId;
              const isCompleted = session.status === "completed";
              const lastMsg = session.messages[session.messages.length - 1];

              return (
                <div
                  key={session.id}
                  className={`p-3.5 rounded-xl border transition text-left relative bg-white ${
                    isActive
                      ? "border-[#81B29A] ring-1 ring-[#81B29A]/30 bg-emerald-50/10"
                      : "border-[#EBEAE4] hover:border-gray-300"
                  }`}
                  id={`history-card-${session.id}`}
                >
                  {/* Card Badge and Date Header */}
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-bold bg-[#FAF9F6] border border-[#EBEAE4] text-gray-500 px-1.5 py-0.5 rounded">
                        {session.gradeDetail}
                      </span>
                      {isCompleted ? (
                        <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <CheckCircle className="w-2.5 h-2.5 fill-current" />
                          정복 완료
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200/50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <AlertCircle className="w-2.5 h-2.5" />
                          대기/진행 중
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-gray-400 font-mono font-medium">
                      {new Date(session.createdAt).toLocaleDateString("ko-KR", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>

                  {/* Title and Short descriptions */}
                  <h4 className="text-xs font-extrabold text-[#2C2C2C] leading-normal line-clamp-1">
                    {session.problemTitle}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1 leading-normal font-sans">
                    <strong>첫 질문:</strong> {session.problemDescription}
                  </p>

                  {/* Bubble Preview */}
                  {lastMsg && (
                    <div className="mt-2 text-[10.5px] bg-[#FAF9F6] border border-[#EBEAE4] rounded-lg p-2 text-gray-600 font-sans italic line-clamp-2 leading-relaxed">
                      💬 <strong>{lastMsg.sender === "user" ? "나" : "멘토"}:</strong> {lastMsg.text}
                    </div>
                  )}

                  {/* Actions Bar inside Card */}
                  <div className="mt-3 pt-2.5 border-t border-[#FAF9F6] flex justify-between items-center">
                    <button
                      onClick={() => onSelectSession(session.id)}
                      className={`text-[10.5px] font-black flex items-center gap-1.5 py-1 px-3 rounded-md transition ${
                        isActive
                          ? "bg-[#81B29A] text-white"
                          : "bg-[#2C2C2C] text-white hover:bg-[#404040]"
                      }`}
                      title="해당 대화방을 로드해서 이어서 대화합니다."
                    >
                      <Play className="w-3 h-3 fill-current" />
                      {isActive ? "현재 대화방 활성 중" : "다시 대화하기 / 재개"}
                    </button>

                    <button
                      onClick={() => onDeleteSession(session.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition"
                      title="대화 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
