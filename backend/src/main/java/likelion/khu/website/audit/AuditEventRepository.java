package likelion.khu.website.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

// append-only: JpaRepository/CrudRepository를 상속하지 않고 필요한 연산(저장·조회)만 노출한다.
// delete·수정 메서드가 아예 존재하지 않으므로 "앱을 통해선 감사 기록을 지우거나 고칠 수 없다"가
// 코드 레벨에서 보장된다(#338). 새 메서드를 추가하더라도 삭제·수정 계열은 절대 넣지 않는다.
public interface AuditEventRepository extends Repository<AuditEvent, Long> {

    AuditEvent save(AuditEvent event);

    // 넘기지 않은(=null) 조건은 무시하고, 검색어(q)는 사람이 목록에서 보는 주요 식별 정보에
    // 부분일치시킨다. excludedEventType은 주요 활동 보기의 반복 기록을 숨기는 데만 쓴다. 최신순.
    @Query("""
            select e from AuditEvent e
            where (:actorType is null or e.actorType = :actorType)
              and (:action is null or e.action = :action)
              and (:eventType is null or e.eventType = :eventType)
              and (:targetType is null or lower(e.targetType) = lower(:targetType))
              and (:targetId is null or e.targetId = :targetId)
              and (:outcome is null or e.outcome = :outcome)
              and (:excludedEventType is null or e.eventType <> :excludedEventType)
              and (:from is null or e.occurredAt >= :from)
              and (:to is null or e.occurredAt <= :to)
              and (:q is null
                   or lower(e.actorLabel) like lower(concat('%', :q, '%'))
                   or lower(e.path) like lower(concat('%', :q, '%'))
                   or lower(e.summary) like lower(concat('%', :q, '%'))
                   or lower(e.targetType) like lower(concat('%', :q, '%')))
            order by e.occurredAt desc, e.id desc
            """)
    Page<AuditEvent> search(@Param("actorType") ActorType actorType,
                            @Param("action") AuditAction action,
                            @Param("eventType") AuditEventType eventType,
                            @Param("targetType") String targetType,
                            @Param("targetId") Long targetId,
                            @Param("outcome") AuditOutcome outcome,
                            @Param("excludedEventType") AuditEventType excludedEventType,
                            @Param("from") LocalDateTime from,
                            @Param("to") LocalDateTime to,
                            @Param("q") String q,
                            Pageable pageable);
}
