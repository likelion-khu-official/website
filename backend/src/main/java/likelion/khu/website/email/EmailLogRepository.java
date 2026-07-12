package likelion.khu.website.email;

import org.springframework.data.jpa.repository.JpaRepository;

// 메서드 하나 없는 빈 인터페이스지만, Spring Data JPA가 런타임에 구현체를 자동 생성해 빈으로 등록함.
// 지금은 save()/findAll() 등 기본 CRUD만 필요해서 커스텀 쿼리 메서드 없음 — 조회 요구(예: 수신자별 이력)가 생기면 그때 추가.
// <EmailLog, Long>: 다루는 엔티티 타입, 그 엔티티의 PK(EmailLog.id) 타입.
public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {
}
