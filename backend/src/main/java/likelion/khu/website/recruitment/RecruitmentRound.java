package likelion.khu.website.recruitment;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "recruitment_rounds")
@Getter
@NoArgsConstructor
public class RecruitmentRound {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "integer")
    private Long id;

    @Column(nullable = false)
    private LocalDateTime openedAt;

    private LocalDateTime closedAt;

    private RecruitmentRound(LocalDateTime openedAt) {
        this.openedAt = openedAt;
    }

    public static RecruitmentRound openNow() {
        return new RecruitmentRound(LocalDateTime.now());
    }

    public void closeNow() {
        if (closedAt == null) {
            closedAt = LocalDateTime.now();
        }
    }
}
