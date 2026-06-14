import { SchoolTier } from "./types";

export interface SampleProblem {
  id: string;
  gradeTier: SchoolTier;
  gradeDetail: string;
  topic: string;
  problemTitle: string;
  problemDescription: string;
}

export const SAMPLE_PROBLEMS: SampleProblem[] = [
  // 초등학교 (ELEMENTARY)
  {
    id: "elem-1",
    gradeTier: SchoolTier.ELEMENTARY,
    gradeDetail: "초등학교 1학년 2학기",
    topic: "덧셈과 뺄셈",
    problemTitle: "동물 친구들의 사과 나눠 먹기",
    problemDescription: "토끼가 상큼한 오렌지 15개를 가지고 소풍을 가고 있었어요. 가는 길에 배가 고픈 곰돌이 친구를 만나서 오렌지 7개를 양보해 주었답니다. 이제 착한 토끼에게 남아 있는 오렌지는 몇 개일까요?"
  },
  {
    id: "elem-2",
    gradeTier: SchoolTier.ELEMENTARY,
    gradeDetail: "초등학교 3학년 1학기",
    topic: "나눗셈",
    problemTitle: "동글동글 어항 마리모 나누기",
    problemDescription: "수진이는 몽글몽글 예쁜 수중식물 마리모 28마리를 키우고 있어요. 책상 위에 투명한 어항 4개를 나란히 두고 마리모를 똑같이 나누어 담아주려고 해요. 어항 1개당 예쁜 마리모가 몇 마리씩 쏙 들어가게 될까요?"
  },
  {
    id: "elem-3",
    gradeTier: SchoolTier.ELEMENTARY,
    gradeDetail: "초등학교 5학년 2학기",
    topic: "분수의 곱셈",
    problemTitle: "친구와 사이좋게 나누어 먹는 초코쿠키",
    problemDescription: "할머니께서 구워주신 큰 초코쿠키가 한 판 있어요. 은지가 쿠키 한 판의 4분의 3을 아주 맛있게 먹었답니다. 그리고 남은 쿠키 부분 중에서 3분의 2만큼을 동생 준이가 먹었어요. 준이가 먹은 쿠키는 처음 전체 한 판과 비교했을 때 얼마만큼의 크기일까요?"
  },

  // 중학교 (MIDDLE)
  {
    id: "mid-1",
    gradeTier: SchoolTier.MIDDLE,
    gradeDetail: "중학교 1학년 1학기",
    topic: "일차방정식",
    problemTitle: "마법 같은 미지의 수 x 알아내기",
    problemDescription: "수첩에 적힌 비밀의 수 $x$가 있습니다. 이 비밀의 수 $x$에 3배를 곱한 뒤에, 5를 빼주었더니 신기하게도 딱 16이라는 숫자가 되었습니다. 이 수첩에 적힌 원래 비밀의 수 $x$의 값을 찾아내 보세요."
  },
  {
    id: "mid-2",
    gradeTier: SchoolTier.MIDDLE,
    gradeDetail: "중학교 2학년 2학기",
    topic: "피타고라스 정리",
    problemTitle: "직각삼각형의 빗변 비밀 열쇠",
    problemDescription: "밑변의 길이가 $6\\text{cm}$이고 높이가 $8\\text{cm}$인 곧게 뻗은 모양의 직각삼각형이 하나 놓여 있습니다. 이 부러진 모양의 직각삼각형에서 빗변(가장 긴 변)의 구체적인 길이를 식을 세워 알아내 보세요."
  },
  {
    id: "mid-3",
    gradeTier: SchoolTier.MIDDLE,
    gradeDetail: "중학교 3학년 1학기",
    topic: "이차방정식",
    problemTitle: "두 개의 해를 품은 이차방정식",
    problemDescription: "좌변을 예쁘게 인수분해를 하거나 근의 공식을 쓸 수 있는 이차방정식 $x^2 - 5x + 6 = 0$이 있습니다. 이 방정식을 참이 되게 만드는 미지수 $x$의 해를 모두 찾아 보세요."
  },

  // 고등학교 (HIGH)
  {
    id: "high-1",
    gradeTier: SchoolTier.HIGH,
    gradeDetail: "고등학교 1학년 수학",
    topic: "이차부등식",
    problemTitle: "경계 속을 만족하는 실수의 범위",
    problemDescription: "실수 전체에서 정의된 이차부등식 $x^2 - 4x + 3 < 0$을 만족하는 실수 $x$값들의 올바르고 엄밀한 범위를 논리적으로 유도하여 구해 보세요."
  },
  {
    id: "high-2",
    gradeTier: SchoolTier.HIGH,
    gradeDetail: "고등학교 2학년 수학 I",
    topic: "로그의 성질과 진수 조건",
    problemTitle: "로그의 정의를 이용한 실근 찾기",
    problemDescription: "로그가 제 역할을 하려면 밑 조건과 진수 조건을 반드시 생각해야 해요. 주어진 로그방정식 $\\log_2 (x - 3) = 3$의 정의를 근거로 삼아 참인 실근 $x$의 값을 정수 범위로 유도하세요."
  },
  {
    id: "high-3",
    gradeTier: SchoolTier.HIGH,
    gradeDetail: "고등학교 3학년 미적분",
    topic: "도함수와 미분계수",
    problemTitle: "접선의 기울기를 결정하는 미분계수의 정의",
    problemDescription: "다항함수 $f(x) = 3x^2 + 2x$가 주어졌을 때, 평균변화율의 극한 성질을 이용한 미분계수의 정의 식 $f'(2) = \\lim_{h \\to 0} \\frac{f(2+h) - f(2)}{h}$를 활용하여 $x=2$에서의 미분계수 $f'(2)$의 실제 유도 과정과 결과값을 밝혀내세요."
  }
];
