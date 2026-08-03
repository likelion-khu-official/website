package likelion.khu.website.application;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// 폼 정의는 사이트에 하나뿐(현재 활성 지원서)이라 RecruitmentStatus처럼 싱글턴 행으로 둔다 —
// id를 SINGLETON_ID로 고정해 두 번째 행이 생길 수 없게 한다. "다음 기수엔 고쳐서 다시 연다"는
// 이 한 행의 schemaJson을 갱신하는 것으로 충분하다(과거 기수 지원서는 제출 스냅샷이 따로 보관 #152).
@Entity
@Table(name = "application_form")
@Getter
@NoArgsConstructor
public class ApplicationForm {

    public static final Long SINGLETON_ID = 1L;

    @Id
    private Long id = SINGLETON_ID;

    // 질문 정의(JSON) 통째. FE가 정의한 스키마를 파싱하지 않고 그대로 저장한다(#152).
    @Column(columnDefinition = "TEXT", nullable = false)
    private String schemaJson;

    private LocalDateTime updatedAt;

    private String updatedBy;

    public ApplicationForm(String schemaJson, String updatedBy) {
        this.schemaJson = schemaJson;
        this.updatedBy = updatedBy;
        this.updatedAt = LocalDateTime.now();
    }

    public void update(String schemaJson, String updatedBy) {
        this.schemaJson = schemaJson;
        this.updatedBy = updatedBy;
        this.updatedAt = LocalDateTime.now();
    }
}
