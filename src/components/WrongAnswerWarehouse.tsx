import { useState } from "react";
import { WrongAnswerRecord, SchoolTier } from "../types";
import { BookOpen, AlertTriangle, Lightbulb, Trash2, Target, Sparkles } from "lucide-react";

interface WrongAnswerWarehouseProps {
  records: WrongAnswerRecord[];
  onClearRecords: () => void;
  onSelectChallenge: (record: WrongAnswerRecord) => void;
}

export default function WrongAnswerWarehouse({
  records,
  onClearRecords,
  onSelectChallenge
}: WrongAnswerWarehouseProps) {
  const [filter, setFilter] = useState<string>("ALL");
  const [isConfirmingClear, setIsConfirmingClear] = useState<boolean>(false);

  const handleClearClick = () => {
    if (!isConfirmingClear) {
      setIsConfirmingClear(true);
      setTimeout(() => setIsConfirmingClear(false), 4500);
    } else {
      onClearRecords();
      setIsConfirmingClear(false);
    }
  };

  const filteredRecords = records.filter((rec) => {
    if (filter === "ALL") return true;
    if (filter === "ELEMENTARY") return rec.gradeTier === SchoolTier.ELEMENTARY;
    if (filter === "MIDDLE") return rec.gradeTier === SchoolTier.MIDDLE;
    if (filter === "HIGH") return rec.gradeTier === SchoolTier.HIGH;
    return true;
  });

  // Calculate mistake reasons for statistics
  const categoryStats = records.reduce((acc: { [key: string]: number }, cur) => {
    const reason = cur.wrong_reason.toLowerCase();
    let category = "개념 혼동";
    if (reason.includes("연산") || reason.includes("실수") || reason.includes("계산")) {
      category = "단순 연산 실수";
    } else if (reason.includes("이항") || reason.includes("부호")) {
      category = "이항·부호 실수";
    } else if (reason.includes("조건") || reason.includes("범위") || reason.includes("미고려")) {
      category = "조건 해석 누락";
    } else if (reason.includes("수식") || reason.includes("공식")) {
      category = "공식 오접용";
    }
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6" id="wrong-answer-warehouse-root">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EBEAE4] pb-4" id="warehouse-header">
        <div>
          <h2 className="text-xl font-bold font-sans text-[#2C2C2C] flex items-center gap-2 break-keep">
            <AlertTriangle className="w-5 h-5 text-[#E07A5F]" />
            성장을 위한 나의 오답 창고
          </h2>
          <p className="text-xs text-gray-500 mt-1 font-sans break-keep">
            의도적인 오답 분석과 오답 극복 문제를 통해 실수를 단단한 수학적 실력으로 승화하세요.
          </p>
        </div>

        {records.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isConfirmingClear && (
              <button
                type="button"
                onClick={() => setIsConfirmingClear(false)}
                className="text-[10px] text-gray-400 hover:text-gray-600 px-2 py-1 underline font-sans"
              >
                취소
              </button>
            )}
            <button
              type="button"
              onClick={handleClearClick}
              className={`flex items-center gap-2 text-xs transition px-3 py-1.5 rounded-md border whitespace-nowrap shrink-0 font-medium ${
                isConfirmingClear
                  ? "bg-red-600 text-white border-transparent hover:bg-red-700 animate-pulse"
                  : "text-[#E07A5F] border-[#E07A5F] border-dashed hover:bg-[#FDF6F4] hover:text-[#c45a40]"
              }`}
              title="오답 내역을 포맷합니다."
              id="clear-warehouse-btn"
            >
              <Trash2 className="w-4 h-4" />
              {isConfirmingClear ? "진짜 비우기 (클릭)!" : "창고 비우기"}
            </button>
          </div>
        )}
      </div>

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border-2 border-dashed border-[#EBEAE4] bg-[#FAF9F6] text-center" id="empty-warehouse">
          <BookOpen className="w-12 h-12 text-[#81B29A] mb-3 stroke-1" />
          <p className="text-sm font-semibold text-[#2C2C2C] break-keep">아직 기록된 오답이 없습니다!</p>
          <p className="text-xs text-gray-500 max-w-sm mt-1 break-keep">
            수학 멘토와 질문하고 대답하는 동안 범했던 작은 수학적 실수나 잘못 적용한 개념에 대한 피드백이 대화가 끝날 때 자동으로 오답 창고로 배달됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-6" id="warehouse-content">
          {/* Top Row: Visual Analytics Overview in a horizontal bento layout */}
          <div className="bg-[#F4F3EF] p-4 rounded-xl border border-[#EBEAE4] space-y-4" id="analytics-column">
            <h3 className="text-xs font-bold text-[#2C2C2C] flex items-center gap-1.5 break-keep">
              <Target className="w-4 h-4 text-[#81B29A]" />
              오답 패턴 심층 분석 (Meta-Metrics)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="analytics-metrics-grid">
              {/* General Counts */}
              <div className="bg-white p-3 rounded-lg border border-[#EBEAE4] flex items-center justify-around md:flex-col md:justify-center">
                <div className="text-center">
                  <span className="text-xl font-black text-[#E07A5F]">{records.length}</span>
                  <p className="text-[10px] text-gray-500 font-sans mt-0.5 whitespace-nowrap">전체 수집 오답</p>
                </div>
                <div className="h-6 w-[1.5px] bg-gray-200 md:hidden"></div>
                <div className="text-center md:mt-2">
                  <span className="text-xl font-black text-[#81B29A]">
                    {records.filter(r => r.solvedEquivalent).length}
                  </span>
                  <p className="text-[10px] text-gray-500 font-sans mt-0.5 whitespace-nowrap">유사문제 정복완료</p>
                </div>
              </div>

              {/* Mini Progress Bar or patterns */}
              <div className="bg-white p-3 rounded-lg border border-[#EBEAE4] space-y-2">
                <h4 className="text-[10px] font-bold text-[#2C2C2C] break-keep">빈도 높은 오답 유형 TOP 3</h4>
                <div className="space-y-1.5">
                  {Object.entries(categoryStats).slice(0, 3).map(([cat, count]) => {
                    const percent = Math.round((count / records.length) * 100);
                    return (
                      <div key={cat} className="space-y-0.5">
                        <div className="flex justify-between text-[9px] font-medium">
                          <span className="text-gray-600 break-keep">{cat}</span>
                          <span className="text-gray-500 whitespace-nowrap">{percent}% ({count}회)</span>
                        </div>
                        <div className="w-full bg-[#EBEAE4] rounded-full h-1">
                          <div
                            className="bg-[#E07A5F] h-1 rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mentors Note Box */}
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-[10px] text-amber-800 flex gap-2 break-keep items-start justify-start">
                <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>멘토의 팁:</strong> 자주 반복되는 유형의 오답이 있다면, 문제 풀이 시 다음 식을 전개하기 전에 한 번 더 검토하는 행동적 루틴을 길러보세요!
                </span>
              </div>
            </div>
          </div>

          {/* Full Width Column: Interactive lists */}
          <div className="space-y-4" id="records-list-column">
            {/* Filter Navigation */}
            <div className="flex flex-wrap gap-2 text-xs" id="warehouse-filters">
              {[
                { label: "모든 오답", code: "ALL" },
                { label: "초등과정", code: "ELEMENTARY" },
                { label: "중등과정", code: "MIDDLE" },
                { label: "고등과정", code: "HIGH" }
              ].map((btn) => (
                <button
                  key={btn.code}
                  onClick={() => setFilter(btn.code)}
                  className={`px-3 py-1.5 rounded-full transition font-medium border whitespace-nowrap shrink-0 ${
                    filter === btn.code
                      ? "bg-[#2C2C2C] text-white border-transparent"
                      : "bg-white text-gray-600 border-[#EBEAE4] hover:bg-gray-50"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {filteredRecords.length === 0 ? (
              <div className="text-center py-12 bg-[#FAF9F6] border border-[#EBEAE4] rounded-xl text-gray-500 text-xs break-keep">
                현재 선택된 필터에 해당하는 오답 기록이 없습니다.
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1" id="records-scrollable-container">
                {filteredRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className={`p-5 rounded-xl border transition ${
                      rec.solvedEquivalent
                        ? "bg-white border-[#E1EAF4] opacity-80"
                        : "bg-white border-[#EBEAE4] hover:shadow-sm"
                    }`}
                    id={`wrong-record-${rec.id}`}
                  >
                    {/* Record Info Tag */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#FAF9F6] pb-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] bg-[#EBEAE4] px-2 py-0.5 rounded text-gray-600 whitespace-nowrap">
                          {rec.gradeDetail}
                        </span>
                        <span className="text-xs font-bold text-[#81B29A] break-keep">{rec.core_concept}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
                        {new Date(rec.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Original Problem details */}
                    <div className="bg-[#FAF9F6] p-3 rounded-lg border border-[#F4F3EF] mb-4">
                      <span className="text-[10px] font-bold text-[#E07A5F] block mb-1 uppercase tracking-wider">
                        [틀렸던 문항 문제 복기]
                      </span>
                      <p className="text-xs text-[#2C2C2C] leading-relaxed line-clamp-3 break-keep">
                        {rec.problemText}
                      </p>
                    </div>

                    {/* Error Analysis and Action Recipes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-xs leading-relaxed">
                      <div className="space-y-1">
                        <span className="font-semibold text-red-600 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          나의 구체적 실수 원인
                        </span>
                        <p className="text-gray-700 bg-red-50/50 p-2.5 rounded border border-red-100 break-keep">
                          {rec.wrong_reason}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="font-semibold text-[#81B29A] flex items-center gap-1">
                          <Lightbulb className="w-3.5 h-3.5" />
                          멘토의 수학 처방전
                        </span>
                        <p className="text-gray-700 bg-emerald-50/50 p-2.5 rounded border border-emerald-100 break-keep">
                          {rec.recommended_action}
                        </p>
                      </div>
                    </div>

                    {/* Problem Re-challenge Actions */}
                    <div className="flex justify-between items-center bg-[#FDFEFC] border-t border-[#F2F1EC] pt-4 mt-2">
                      <span className="text-[10px] text-gray-400 break-keep">
                        {rec.solvedEquivalent ? "✅ 정복 완료된 핵심 개념입니다." : "🎯 아직 정복하지 못한 개념이에요."}
                      </span>

                      <button
                        onClick={() => onSelectChallenge(rec)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition whitespace-nowrap shrink-0 ${
                          rec.solvedEquivalent
                            ? "bg-[#EBEAE4] text-gray-500 cursor-not-allowed"
                            : "bg-[#E07A5F] text-white hover:bg-[#c45a40] shadow-sm hover:shadow"
                        }`}
                        id={`rectify-btn-${rec.id}`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        유사 오답 정복 도전!
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
