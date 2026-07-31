package likelion.khu.website.audit;

// 감사 이벤트를 일으킨 주체의 종류. 웹사이트 관리자(ADMIN)와 조직상 운영진(멤버의 역할)은 다른 축이라,
// 여기서 ADMIN은 어드민 계정을, MEMBER는 로그인한 부원 계정을 뜻한다.
public enum ActorType {
    ADMIN,      // 웹사이트 관리자 계정
    MEMBER,     // 로그인한 부원 계정
    ANONYMOUS,  // 로그인하지 않은 요청
    SYSTEM      // 사람이 아닌 자동 처리
}
