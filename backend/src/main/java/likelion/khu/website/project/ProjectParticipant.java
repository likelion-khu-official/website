package likelion.khu.website.project;

import jakarta.persistence.*;
import likelion.khu.website.member.Member;
import likelion.khu.website.member.MemberRole;
import lombok.Getter;
import lombok.NoArgsConstructor;

// "참여 멤버(이름·파트)" — 이름은 Member.name을 조인해서, 파트는 이 프로젝트에서 맡은 역할(MemberRole 재사용,
// Member.roles와는 별개 — 조직 전체 역할과 프로젝트별 역할이 다를 수 있다).
@Entity
@Table(name = "project_participants")
@Getter
@NoArgsConstructor
public class ProjectParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MemberRole part;

    public static ProjectParticipant create(Project project, Member member, MemberRole part) {
        ProjectParticipant participant = new ProjectParticipant();
        participant.project = project;
        participant.member = member;
        participant.part = part;
        return participant;
    }
}
