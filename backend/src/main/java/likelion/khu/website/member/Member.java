package likelion.khu.website.member;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "members")
@Getter
@NoArgsConstructor
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @ElementCollection(fetch = FetchType.EAGER)
    @Enumerated(EnumType.STRING)
    @CollectionTable(name = "member_roles", joinColumns = @JoinColumn(name = "member_id"))
    @Column(name = "role")
    private Set<MemberRole> roles = new HashSet<>();

    @Column(nullable = false)
    private Integer cohort;

    @Column(nullable = false)
    private String emoji;

    private String photoUrl;

    @Column(columnDefinition = "TEXT")
    private String joinReason;

    @Column(nullable = false)
    private String createdBy;

    @Column(nullable = false)
    private String updatedBy;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public static Member create(String name, Set<MemberRole> roles, Integer cohort, String emoji,
                                String photoUrl, String joinReason, String createdBy) {
        Member m = new Member();
        m.name = name;
        m.roles = roles != null ? new HashSet<>(roles) : new HashSet<>();
        m.cohort = cohort;
        m.emoji = emoji;
        m.photoUrl = photoUrl;
        m.joinReason = joinReason;
        m.createdBy = createdBy;
        m.updatedBy = createdBy;
        LocalDateTime now = LocalDateTime.now();
        m.createdAt = now;
        m.updatedAt = now;
        return m;
    }

    public void update(String name, Set<MemberRole> roles, String photoUrl, String joinReason, String updatedBy) {
        if (name != null) this.name = name;
        if (roles != null) this.roles = new HashSet<>(roles);
        if (photoUrl != null) this.photoUrl = photoUrl.isEmpty() ? null : photoUrl;
        if (joinReason != null) this.joinReason = joinReason;
        this.updatedBy = updatedBy;
        this.updatedAt = LocalDateTime.now();
    }
}
