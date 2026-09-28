// 大学資料・生活時間は配信せず、本人の端末から読み込む。
let ALL_SUBJECTS = [], BADGES = [], SEMESTERS = [], STUDENT_GUIDE = [];
let MC_REQUIRED_CODES = [], GRADUATION_RULES = {};
const SUBJECT_BY_CODE = new Map();
// --- カテゴリ表示設定 ---
const CATEGORY_CONFIG = {
  '専門':   { color: '#f59e0b', bg: '#78350f', icon: '💻' },
  '教養':   { color: '#10b981', bg: '#064e3b', icon: '🌿' },
  '外国語': { color: '#8b5cf6', bg: '#4c1d95', icon: '🌐' },
};

const BADGE_LEVEL_CONFIG = {
  bronze:   { label: 'ブロンズ', color: '#cd7f32', bg: '#431407', icon: '🥉' },
  silver:   { label: 'シルバー', color: '#94a3b8', bg: '#1e293b', icon: '🥈' },
  gold:     { label: 'ゴールド', color: '#f59e0b', bg: '#451a03', icon: '🥇' },
  platinum: { label: 'プラチナ', color: '#67e8f9', bg: '#0c4a6e', icon: '💎' },
};
