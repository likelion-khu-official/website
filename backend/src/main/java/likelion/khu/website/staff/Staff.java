package likelion.khu.website.staff;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "staff")
@Getter
@NoArgsConstructor
public class Staff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "integer")
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String position;

    @Column(nullable = false)
    private String department;

    @Column(nullable = false)
    private Integer admissionYear;

    @Column(nullable = false)
    private String photoUrl;

    @Column(columnDefinition = "TEXT")
    private String introduction;

    @Column(nullable = false)
    private Integer sortOrder;

    @Column(nullable = false)
    private String createdBy;

    @Column(nullable = false)
    private String updatedBy;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public static Staff create(String name, String position, String department, Integer admissionYear,
                                String photoUrl, String introduction, Integer sortOrder, String createdBy) {
        Staff s = new Staff();
        s.name = name;
        s.position = position;
        s.department = department;
        s.admissionYear = admissionYear;
        s.photoUrl = photoUrl;
        s.introduction = introduction;
        s.sortOrder = sortOrder;
        s.createdBy = createdBy;
        s.updatedBy = createdBy;
        LocalDateTime now = LocalDateTime.now();
        s.createdAt = now;
        s.updatedAt = now;
        return s;
    }

    // 이름·학과·학번은 수정 API 스코프 밖 — 등록 후 불변
    public void update(String position, String photoUrl, String introduction, Integer sortOrder, String updatedBy) {
        if (position != null) this.position = position;
        if (photoUrl != null) this.photoUrl = photoUrl;
        if (introduction != null) this.introduction = introduction;
        if (sortOrder != null) this.sortOrder = sortOrder;
        this.updatedBy = updatedBy;
        this.updatedAt = LocalDateTime.now();
    }
}