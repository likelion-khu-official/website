package likelion.khu.website.member;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Duration;
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

    // 로그인 아이디. #117 — 계정·인증(학번 로그인) 이전에 만들어진 멤버는 없어 nullable 없이 unique로 둔다.
    @Column(nullable = false, unique = true)
    private String studentId;

    @Column(nullable = false)
    private String passwordHash;

    // 초기 비밀번호(전화번호) 발급·관리자 초기화 시 재사용하는 원본값.
    @Column(nullable = false)
    private String phone;

    @Column(nullable = false)
    private boolean mustChangePassword;

    @Column(nullable = false)
    private int failedLoginAttempts;

    private LocalDateTime lockedUntil;

    // 오프보딩(소프트 딜리트) 시각. null이면 재적 중 — 계정으로 로그인만 막고 글·프로젝트 등
    // 다른 테이블의 기록은 건드리지 않는다(#145).
    private LocalDateTime offboardedAt;

    @Column(nullable = false)
    private String createdBy;

    @Column(nullable = false)
    private String updatedBy;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public static Member create(String name, Set<MemberRole> roles, Integer cohort, String emoji,
                                String photoUrl, String joinReason, String createdBy,
                                String studentId, String phone, String initialPasswordHash) {
        Member m = new Member();
        m.name = name;
        m.roles = roles != null ? new HashSet<>(roles) : new HashSet<>();
        m.cohort = cohort;
        m.emoji = emoji;
        m.photoUrl = photoUrl;
        m.joinReason = joinReason;
        m.studentId = studentId;
        m.phone = phone;
        m.passwordHash = initialPasswordHash;
        m.mustChangePassword = true;
        m.failedLoginAttempts = 0;
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

    public boolean isLocked() {
        return lockedUntil != null && LocalDateTime.now().isBefore(lockedUntil);
    }

    public void recordFailedLogin(int maxAttempts, Duration lockoutDuration) {
        failedLoginAttempts++;
        if (failedLoginAttempts >= maxAttempts) {
            lockedUntil = LocalDateTime.now().plus(lockoutDuration);
        }
        updatedAt = LocalDateTime.now();
    }

    public void recordSuccessfulLogin() {
        failedLoginAttempts = 0;
        lockedUntil = null;
        updatedAt = LocalDateTime.now();
    }

    // 본인이 첫 로그인 때(또는 이후 자율적으로) 비밀번호를 바꿀 때 — 강제 변경 상태를 해제한다.
    public void changePassword(String newPasswordHash) {
        this.passwordHash = newPasswordHash;
        this.mustChangePassword = false;
        this.updatedAt = LocalDateTime.now();
    }

    // 관리자가 분실 비밀번호를 초기화할 때 — 전화번호로 되돌리고 다시 강제 변경 상태로 만든다.
    public void resetPasswordByAdmin(String phoneBasedPasswordHash) {
        this.passwordHash = phoneBasedPasswordHash;
        this.mustChangePassword = true;
        this.failedLoginAttempts = 0;
        this.lockedUntil = null;
        this.updatedAt = LocalDateTime.now();
    }

    public boolean isOffboarded() {
        return offboardedAt != null;
    }

    // 졸업·탈퇴 처리 — 계정 자체는 지우지 않는다(글·프로젝트 등 다른 테이블이 이 id를 계속 참조).
    public void offboard() {
        this.offboardedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
}
