export enum SchoolTier {
  ELEMENTARY = "초등학교",
  MIDDLE = "중학교",
  HIGH = "고등학교"
}

export interface ChatMessage {
  id: string;
  sender: "user" | "mentor" | "system";
  text: string;
  timestamp: string;
  hasWrongData?: boolean;
  imageUrl?: string; // Base64 or Object URL of user submitted photo
}

export interface WrongAnswerData {
  wrong_reason: string;
  core_concept: string;
  recommended_action: string;
}

export interface WrongAnswerRecord extends WrongAnswerData {
  id: string;
  problemText: string;
  gradeTier: SchoolTier;
  gradeDetail: string;
  createdAt: string;
  solvedEquivalent?: boolean;
}

export interface MentoringSession {
  id: string;
  gradeTier: SchoolTier;
  gradeDetail: string;
  problemTitle: string;
  problemDescription: string;
  problemImageUrl?: string; // Original input problem photo
  messages: ChatMessage[];
  status: "active" | "metacognition" | "completed";
  createdAt: string;
  wrongAnswerLogged?: boolean;
}

export interface AppUser {
  username: string;
  passwordHash: string; // Plaintext representation for local mock database
  createdAt: string;
}

