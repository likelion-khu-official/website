package likelion.khu.website.project;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "projects")
@Getter
@NoArgsConstructor
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    // 목록 카드의 "한 줄 소개". 상세 설명·발표자료는 스펙상 처음엔 생략 가능이라 필드 자체를 안 둔다.
    @Column(nullable = false, columnDefinition = "TEXT")
    private String summary;

    @Column(nullable = false)
    private Integer cohort;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "project_tech_stack", joinColumns = @JoinColumn(name = "project_id"))
    @Column(name = "tech")
    private Set<String> techStack = new HashSet<>();

    private String githubUrl;

    private LocalDate startDate;

    // null이면 진행 중인 프로젝트.
    private LocalDate endDate;

    // 초안 개념이 없어(등록=즉시 공개) Post의 상태전이 대신 단순 불리언으로 충분.
    @Column(nullable = false)
    private boolean hidden;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public static Project create(String title, String summary, Integer cohort, Set<String> techStack,
                                  String githubUrl, LocalDate startDate, LocalDate endDate) {
        Project p = new Project();
        p.title = title;
        p.summary = summary;
        p.cohort = cohort;
        p.techStack = techStack != null ? new HashSet<>(techStack) : new HashSet<>();
        p.githubUrl = githubUrl;
        p.startDate = startDate;
        p.endDate = endDate;
        p.hidden = false;
        LocalDateTime now = LocalDateTime.now();
        p.createdAt = now;
        p.updatedAt = now;
        return p;
    }

    public void update(String title, String summary, Set<String> techStack,
                        String githubUrl, LocalDate startDate, LocalDate endDate) {
        if (title != null) this.title = title;
        if (summary != null) this.summary = summary;
        if (techStack != null) this.techStack = new HashSet<>(techStack);
        if (githubUrl != null) this.githubUrl = githubUrl;
        if (startDate != null) this.startDate = startDate;
        if (endDate != null) this.endDate = endDate;
        this.updatedAt = LocalDateTime.now();
    }

    public void setHidden(boolean hidden) {
        this.hidden = hidden;
        this.updatedAt = LocalDateTime.now();
    }
}
