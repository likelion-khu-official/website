package likelion.khu.website.application;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// 제출된 지원서 하나. 답변(answersJson)과 함께, 제출 시점의 폼 정의(schemaSnapshotJson)를
// 스냅샷으로 같이 저장한다 — 다음 기수에 질문이 바뀌어도 이 답변을 "그때의 질문"으로 해석하려면
// 폼 정의가 답변 옆에 박제돼 있어야 하기 때문(#152).
//
// 개인정보 동의 증적: 서버가 동의(privacyConsent=true) 없는 제출을 거부하므로(ApplicationService),
// 이 행이 존재한다는 것 자체가 "동의 하에 접수됐다"는 기록이고 submittedAt이 그 시각이다.
@Entity
@Table(name = "applications")
@Getter
@NoArgsConstructor
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "integer")
    private Long id;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String schemaSnapshotJson;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String answersJson;

    @Column(nullable = false)
    private LocalDateTime submittedAt;

    public Application(String schemaSnapshotJson, String answersJson) {
        this.schemaSnapshotJson = schemaSnapshotJson;
        this.answersJson = answersJson;
        this.submittedAt = LocalDateTime.now();
    }
}
