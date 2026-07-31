package likelion.khu.website.staff;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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

    // 운영진 소개 카드에 보이는 "활동 이력". member_roles와 같은 컬렉션 테이블 패턴.
    // @OrderColumn(sort_order)로 화면에 보이는 순서를 고정한다.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "staff_activities", joinColumns = @JoinColumn(name = "staff_id", columnDefinition = "bigint"))
    @OrderColumn(name = "sort_order")
    @Column(name = "activity", nullable = false)
    private List<String> activities = new ArrayList<>();

    private String studentId;

    private String phone;

    @Column(nullable = false)
    private boolean publicationConsent;

    private LocalDateTime publicationConsentedAt;

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
                               String photoUrl, String introduction, List<String> activities, Integer sortOrder,
                               String studentId, String phone, boolean publicationConsent,
                               LocalDateTime publicationConsentedAt, String createdBy) {
        Staff s = new Staff();
        s.name = name;
        s.position = position;
        s.department = department;
        s.admissionYear = admissionYear;
        s.photoUrl = photoUrl;
        s.introduction = introduction;
        s.activities = activities != null ? new ArrayList<>(activities) : new ArrayList<>();
        s.sortOrder = sortOrder;
        s.studentId = studentId;
        s.phone = phone;
        s.publicationConsent = publicationConsent;
        s.publicationConsentedAt = publicationConsentedAt;
        s.createdBy = createdBy;
        s.updatedBy = createdBy;
        LocalDateTime now = LocalDateTime.now();
        s.createdAt = now;
        s.updatedAt = now;
        return s;
    }

    public void update(String name, String position, String department, Integer admissionYear,
                       String photoUrl, String introduction, List<String> activities, Integer sortOrder,
                       String studentId, String phone, Boolean publicationConsent,
                       LocalDateTime publicationConsentedAt, String updatedBy) {
        if (name != null) this.name = name;
        if (position != null) this.position = position;
        if (department != null) this.department = department;
        if (admissionYear != null) this.admissionYear = admissionYear;
        if (photoUrl != null) this.photoUrl = photoUrl;
        if (introduction != null) this.introduction = introduction;
        if (activities != null) {
            this.activities.clear();
            this.activities.addAll(activities);
        }
        if (sortOrder != null) this.sortOrder = sortOrder;
        if (studentId != null) this.studentId = studentId;
        if (phone != null) this.phone = phone;
        if (publicationConsent != null) {
            this.publicationConsent = publicationConsent;
            this.publicationConsentedAt = publicationConsentedAt;
        }
        this.updatedBy = updatedBy;
        this.updatedAt = LocalDateTime.now();
    }
}
