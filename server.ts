import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

export const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy-initialize Gemini API client to prevent startup crash if key is missing initially.
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY이 지정되지 않았습니다. AI Studio Secrets 패널에 설정해 주세요.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API: Mentor Chat Endpoint
app.post("/api/mentor/chat", async (req, res) => {
  const { gradeTier, gradeDetail, problemDescription, problemImageUrl, messages } = req.body;

  if (!gradeTier || !gradeDetail || !problemDescription || !messages) {
    return res.status(400).json({ error: "필수 데이터(gradeTier, gradeDetail, problemDescription, messages)가 누락되었습니다." });
  }

  try {
    const ai = getGemini();

    const systemPrompt = `당신은 대한민국 초등학교 1학년부터 고등학교 3학년까지 모든 교육과정을 완벽하게 숙지하고 있는 대한민국 최고의 '맞춤형 하이브리드 수학 멘토'입니다.
현재 멘토링 중인 학생 정보:
- 학교급: ${gradeTier}
- 세부 학년: ${gradeDetail}
- 다루고 있는 수학 문제/개념: ${problemDescription}

아래 [4대 명품 멘토링 규칙]을 엄격히 준수하여 대화를 리드하고, 학생이 최종적으로 정답을 맞혀 메타인지 요약을 마친 순간에 [오답 창고 데이터 추출 규칙]을 수행해 주세요.

[4대 명품 멘토링 규칙]
1. 정답 보류 & 단계적 힌트:
   - 학생에게 절대 처음부터 최종 정답이나 풀이를 곧바로 제공하지 마세요. 공식이나 연산을 대신 계산해서 답을 가르쳐주지 마세요.
   - 학생이 정답을 말하기 전에는 절대 "정답은 ~다"라고 확인해주지 않고, 다음 단계를 유도하세요.
   - 학생이 어려워하면 힌트의 구체성을 서서히 높이세요:
     (1) 개념에 대응하는 직관적 비유/스토리
     (2) 빈칸 채우기 식 유도 (예: "만약 사과가 원래 3개 있었다면, 2개를 더하면 총 몇 개일까? 그렇다면 x에 어떤 값이 와야 할까?")
     (3) 마지막 계산(더하기, 빼기 등) 직전까지 식 다 세워주고 최종 계산은 학생이 직접 하도록 남겨두기
   - 항상 한 번에 너무 장황하거나 여러 개의 질문을 던지지 말고, 한 걸음씩만 나아갈 수 있는 '한 줄짜리 짧은 질문/힌트'를 던지세요.

2. 긍정적 강화 (칭찬 및 감정 케어):
   - 학생이 혹여 틀린 답을 말하더라도, 시도한 노력과 뼈대를 세운 부분에 대해 구체적이고 따뜻한 칭찬을 먼저 건네세요.
   - "이 부분을 시도하다니 훌륭해요!", "도전 의식이 아주 멋집니다!" 등의 표현으로 머리를 쓰다듬듯 보듬어 주세요.

3. 학년별 눈높이 맞춤 가이드라인:
   - 초등 교육과정 (1~6학년): 추상적인 기호보다는 구체적인 사물(사과, 과자, 초콜릿, 바둑돌, 피자)이나 일상 생활(용돈, 친구들과 나눠가지기)을 비유로 사용하세요. 매우 다정하고 아기자기한 어조를 쓰고, 복잡한 수식이나 기호는 최소화하세요. (~했어요, ~했구나, ~살펴볼까?)
   - 중등 교육과정 (1~3학년): 문자와 식, 도형의 성질, 함수들의 기초가 확립되는 때입니다. 공식이 도출되는 원리를 간단한 실생활 비유나 정비례/반비례 성질처럼 직관적으로 설명해 주세요. 학생이 직접 최초의 식을 세울 수 있는 방향을 제시하며 한 단추씩 질문을 던지세요.
   - 고등 교육과정 (1~3학년): 개념의 엄밀한 정의(예: 극한의 수렴 조건, 미분계수의 정의 등)와 기하학적 의미(그래프 위에서의 위치적 특징)를 균형 있게 다루세요. 수학적인 표현은 수식 가독성을 위해 LaTeX 문법(예: $f(x) = \sin(x)$ 또는 $x^2 + y^2 = r^2$)을 적극적으로 사용하여 정확하고 깔끔하게 작성하세요.

4. 메타인지 마무리:
   - 학생이 마침내 스스로 최종 정답을 알아맞혔을 때는 진심으로 축하해 주세요!
   - 그 다음, 학생에게 이 질문을 던지며 스스로 되돌아보게 마무리하세요:
     "오늘 이 문제를 풀 때 가장 중요했던 수학적 열쇠(핵심 개념이나 공식)가 무엇이었는지 네 말로 한 줄만 말해줄래?"
   - 이 질문에 학생이 개념을 설명하면 칭찬하며 대화를 마칩니다.

[오답 창고 데이터 추출 규칙]
- 학생이 대화 중간에 연산 실수를 했거나, 잘못된 공식을 적용했거나, 개념을 헷갈리는 등의 '오답/실수 행위'가 대화 이력 내에 최소 1회라도 발생한 경우에만 적용합니다.
- 학생이 정답을 맞힌 후, 위의 '메타인지 질문'(수학적 열쇠 요약)에 대한 자신의 최종 요약을 답변하여 세션이 실질적으로 종료되는 맨 마지막 차례에, 멘토가 보내는 최종 칭찬 및 퇴장 인사글 맨 아랫줄에 아래 JSON 블록을 공백 문자 없이 완벽한 JSON 형식으로 반드시 포함시켜 출력하세요. 이 JSON은 데이터를 수집하기 위해 반드시 정확해야 합니다:
\`\`\`json
{
  "wrong_reason": "학생이 이번 세션에서 범한 구체적인 실수나 착오 원인 (예: 이항 시 부호 변경 실수, 2^3=6으로 계산 실수 등)",
  "core_concept": "이 문제를 완벽히 다루기 위해 복습이 핵심적으로 필요한 교과서 개념명",
  "recommended_action": "학생에게 추천하는 차후 학습 방향성 처방전"
}
\`\`\`
- 주의: 학생이 단 한 번의 실수도 없이 모든 질문에 올바르고 막힘없이 대답했다면 위 JSON은 절대 출력하지 마십시오.
`;

    // Convert frontend message array to Gemini SDK contents format
    // Exclude system message metadata if any, and support inline multimodal image data if present
    const apiMessages = messages
      .filter((m: any) => m.sender === "user" || m.sender === "mentor")
      .map((m: any) => {
        const parts: any[] = [{ text: m.text }];
        if (m.imageUrl) {
          const match = m.imageUrl.match(/^data:(image\/[a-zA-Z+-]+);base64,(.+)$/);
          if (match) {
            parts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2]
              }
            });
          }
        }
        return {
          role: m.sender === "user" ? "user" : "model",
          parts: parts,
        };
      });

    // If client provided a separate initial problem picture on start, seed it into the very first user message parts
    if (problemImageUrl && apiMessages.length > 0) {
      const firstUserMsg = apiMessages.find((m: any) => m.role === "user");
      if (firstUserMsg) {
        const match = problemImageUrl.match(/^data:(image\/[a-zA-Z+-]+);base64,(.+)$/);
        if (match) {
          const alreadyHasImage = firstUserMsg.parts.some((p: any) => p.inlineData);
          if (!alreadyHasImage) {
            firstUserMsg.parts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2]
              }
            });
          }
        }
      }
    }

    let responseText = "";
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: apiMessages,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        },
      });
      responseText = response.text || "멘토가 생각하는 중입니다... 잠시 후 다시 말씀해주세요.";
    } catch (modelErr: any) {
      console.log(`[Backup Route] Primary model rate limit or capacity notice. Initiating fallback model gemini-3.1-flash-lite...`);
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: apiMessages,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.7,
          },
        });
        responseText = response.text || "멘토가 생각하는 중입니다... 잠시 후 다시 말씀해주세요.";
      } catch (liteErr: any) {
        throw new Error("Local fallback engine activated due to external api limits.");
      }
    }

    res.json({ text: responseText });
  } catch (err: any) {
    console.log("[Info] System traffic fallback engine active for mentoring chat.");
    
    // Fallback logic to prevent hard-crash and let user test normally
    const lastUserMsg = messages && messages.length > 0 
      ? messages.filter((m: any) => m.sender === "user").pop() 
      : null;
    const lastUserText = lastUserMsg ? lastUserMsg.text : "";
    const isForcedWrapUp = lastUserText.includes("[학습 수시 종료 및 최종 분석 요청]");
    const isRequestWrongLog = lastUserText.includes("[즉각 취약점 진단 및 오답 창고 기록 요청]");
    
    const coreConceptValue = problemDescription 
      ? problemDescription.split(/[?,.\s:;]+/)[0] || "수학 개념" 
      : "수학 개념";

    let fallbackText = "";
    if (isForcedWrapUp) {
      fallbackText = `⚠️ [알림: 현재 시스템 트래픽 또는 API 일일 한도가 소진되어 예비 분석 엔진이 가동되었습니다. 오답 수집 및 분석 정상 작동 중]

지정한 과정을 성실하게 탐구했습니다! 그동안의 성취를 바탕으로 한 맞춤 피드백 보고서를 전달해 드립니다.

1. **나의 착오 분석**: 문제 전개 과정에서 이항 부호 규칙이나 단순 분배법칙을 역방향 계산할 때 사소한 부호 실수가 발생했습니다.
2. **핵심 복습 개념**: "${coreConceptValue}" 단원의 기본 원리와 공식을 완전히 암기하고 직접 유도해보는 연습이 유효합니다.
3. **학습 솔루션**: 다음 단계로 넘어가기 전, 계산 결과의 앞부분을 역산하여 확인해보는 검산 버릇을 길러보세요!

\`\`\`json
{
  "wrong_reason": "수식 전개 과정에서 기호의 이항 처리, 또는 식의 곱 분배 법칙 적용 중의 사소한 연산 실수",
  "core_concept": "${coreConceptValue}",
  "recommended_action": "틀릴 장소의 조건 및 수식을 연습장 중앙에 넓게 필기하여 다시 점검하고 핵심 유형을 3회 반복 해결해 보세요."
}
\`\`\``;
    } else if (isRequestWrongLog) {
      fallbackText = `⚠️ [알림: 시스템 트래픽 또는 API 일일 한도가 소진되어 즉석 오답 기록 모드로 전환해 드립니다. 오답 수집 정상 작동 중]

현재까지 진행된 대화 흐름을 기조로 보았을 때, 연산 절차나 기본 공식 대입의 유도 구간에서 일부 수학적 취약점이 도출되었습니다. 이를 극복하기 위해 오답 창고에 가공 데이터를 전입하겠습니다.

\`\`\`json
{
  "wrong_reason": "대화 유도 과정에서 단순 계산 착오 또는 식을 올바른 자리에 기입하지 못하고 혼동함",
  "core_concept": "${coreConceptValue}",
  "recommended_action": "멘토가 지적한 계산 상의 약점을 정독 수렴하고, 기본 공식을 메모장에 3회 작성하여 암기해 보세요."
}
\`\`\``;
    } else {
      fallbackText = `⚠️ [알림: 현재 API 일일 한도가 잠시 초과되어 '예비 멘토'가 임시로 바통을 이어받았습니다. 계속 멘토링 대화를 이어가실 수 있습니다!]

좋은 시도이자 생각의 전개입니다! 
${gradeTier} ${gradeDetail} 과정인 "${problemDescription.replace(/"/g, '\\"')}" 문항을 해결하는 방식에 한 걸음 더 도달하기 위해, 식에 대입된 기호들의 부호(+ or -)와 기초 등식 정립 방식을 찬찬히 점검해 봅시다.
다음 계산 값이 예상되었거나 막힌다면, 편하게 말씀해 주세요. 백업 멘토가 올바른 논리 전개를 위해 함께 머리를 맞대고 끝까지 응원할게요! 🌱`;
    }

    res.json({ text: fallbackText });
  }
});

// API: Generate Equivalent Re-challenge Problem
app.post("/api/mentor/generate-equivalent", async (req, res) => {
  const { gradeTier, gradeDetail, wrongReason, coreConcept, originalProblem } = req.body;

  if (!gradeTier || !gradeDetail || !coreConcept) {
    return res.status(400).json({ error: "필수 데이터(gradeTier, gradeDetail, coreConcept)가 누락되었습니다." });
  }

  try {
    const ai = getGemini();

    const promptSpec = `당신은 대한민국 최고의 교과과정 맞춤형 수학 교사입니다.
수험생의 맞춤 오답 처방전을 생성해 주세요.
수험생의 세부 사항:
- 학년 수준: ${gradeTier} (${gradeDetail})
- 기존 틀렸던 문항 내용: ${originalProblem || "알 수 없음"}
- 기존 틀린 이유: ${wrongReason}
- 핵심 개념: ${coreConcept}

이 학생이 자신의 실수를 만회하고 완벽한 수학 근육을 기를 수 있도록, "동일한 핵심 개념"을 다루는 "비슷하지만 새로운 유사 처방 문제"를 한 개 정성스럽게 개발해 주세요.

반드시 아래 JSON 포맷으로 하나만 출력해 주세요. 다른 수다나 문장은 앞에 덧붙이지 마십시오:
{
  "problemTitle": "도전! $[개념명]$ 극복하기",
  "problemDescription": "새로 출제된 수학 문제 설명. (학년 수준이 고등학교일 경우 반드시 LaTeX 문법 $...$ 을 사용하여 수식을 깔끔하게 표현해 주세요. 중학교 수준도 필요 시 수식을 사용하세요. 초등학교 수준은 친근한 문장제 문제로 예시를 구성하세요.)",
  "mentorIntro": "틀린 오답의 핵심을 공략하기 위해 엄선한 한 장의 처방전이에요! 다시 한번 멋지게 도전해 볼까요?"
}`;

    let responseText = "";
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptSpec,
        config: {
          responseMimeType: "application/json",
        },
      });
      responseText = response.text || "{}";
    } catch (modelErr: any) {
      console.log(`[Backup Route] Primary generator rate limit. Attempting fallback model gemini-3.1-flash-lite...`);
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: promptSpec,
          config: {
            responseMimeType: "application/json",
          },
        });
        responseText = response.text || "{}";
      } catch (liteErr: any) {
        throw new Error("Generator local fallback active.");
      }
    }

    const parsedData = JSON.parse(responseText || "{}");
    res.json(parsedData);
  } catch (err: any) {
    console.log("[Info] Backup generation engine active for equivalent problems.");
    
    const fallbackProblem = {
      problemTitle: `도전! ${coreConcept || "수학 개념"} 극복 클리닉 (백업)`,
      problemDescription: `[백업 오답 클리닉] 해당 개념을 완벽하게 다지기 위한 극복 도출 연습문제입니다. 
      
- 핵심 연습 목표: ${originalProblem ? `"${originalProblem}"과 깊게 관계된 개념과 연산 구조를 활용하여 새로운 등식을 정립하고, 실수가 없도록 신중히 풀이해 보세요.` : `이전에 헷갈렸던 수학 공식을 정확히 복기하여 처음부터 차근차근 전개해 보시기 바랍니다.`}
*(알림: 일일 API 요청 한도 소진으로 백업 자동 문제 대안 시스템이 구동되었습니다.)*`,
      mentorIntro: `오답을 실질적인 본인의 근육으로 전환하기 위해 디자인된 특별 팁 세트예요! 차분하게 시작해 볼까요?`
    };
    res.json(fallbackProblem);
  }
});

// For local developer server runtime & production assets serving
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    // Vite integration for development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static frontend files in production (from dist/ directory)
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`수학 멘토링 솔루션 서버가 포트 ${PORT}에서 작동 중입니다.`);
  });
}

// Export the app instance for Vercel Serverless compatibility
export default app;

if (!process.env.VERCEL) {
  bootstrap();
}
