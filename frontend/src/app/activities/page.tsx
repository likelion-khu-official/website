import { redirect } from 'next/navigation';

// 연간 활동 계획의 정본 화면은 랜딩 섹션이다. 옛 URL은 해당 섹션으로 연결한다.
export default function ActivitiesPage() {
  redirect('/#plan');
}
