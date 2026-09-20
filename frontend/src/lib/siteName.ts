// 사이트명 정본. 페이지가 openGraph를 따로 정의하면 layout의 openGraph는 병합되지 않고
// 통째로 교체되므로(Next 메타데이터 규칙), og:site_name이 빠지지 않게 각 페이지가 이 값을 다시 넣는다.
// JSON-LD name·<title>과 같은 이름이어야 구글이 사이트명을 확신한다.
export const SITE_NAME = '멋쟁이사자처럼 경희대학교';
