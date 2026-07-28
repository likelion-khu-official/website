// 연간 활동 계획 — 랜딩 Plan.tsx 티저와 같은 데이터(정적, 새 기수마다 이 배열만 갱신).
// Plan.tsx가 데이터를 export하지 않아 import 대신 동일 내용을 그대로 옮겨 담았다.
export type ActivityMonth = {
  month: string;
  items: string[];
  highlight?: boolean;
};

export const activityMonths: ActivityMonth[] = [
  { month: 'Jan', items: ['지원기간'] },
  { month: 'Feb', items: ['멋사 발대식'] },
  { month: 'Mar', items: ['개강총회', '친해지길 바래'] },
  { month: 'Apr', items: ['세션 스터디'], highlight: true },
  { month: 'May', items: ['아이디어톤', 'MT'] },
  { month: 'Jun', items: ['종강총회'] },
  { month: 'Jul', items: [] },
  { month: 'Aug', items: ['멋쟁이사자처럼 중앙해커톤'] },
  { month: 'Sep', items: [] },
  { month: 'Oct', items: [] },
  { month: 'Nov', items: [] },
  { month: 'Dec', items: ['권역별 / 기업별 연합 해커톤'] },
];
