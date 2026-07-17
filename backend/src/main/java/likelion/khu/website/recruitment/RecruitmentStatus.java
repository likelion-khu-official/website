package likelion.khu.website.recruitment;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// 켜기/끄기 상태가 사이트 전체에 하나뿐이라(멤버·프로젝트처럼 여러 행이 아님) 싱글턴 행 하나로
// 관리한다 — id를 항상 SINGLETON_ID로 고정해 두 번째 행이 생길 수 없게 한다.
@Entity
@Table(name = "recruitment_status")
@Getter
@NoArgsConstructor
public class RecruitmentStatus {

    public static final Long SINGLETON_ID = 1L;

    @Id
    private Long id = SINGLETON_ID;

    @Column(nullable = false)
    private boolean open = false;

    private LocalDateTime openedAt;

    public void markOpened() {
        this.open = true;
        this.openedAt = LocalDateTime.now();
    }

    public void markClosed() {
        this.open = false;
    }
}
