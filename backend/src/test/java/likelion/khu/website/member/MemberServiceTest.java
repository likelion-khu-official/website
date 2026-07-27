package likelion.khu.website.member;

import likelion.khu.website.member.dto.MemberCreateRequest;
import likelion.khu.website.member.dto.MemberAdminResponse;
import likelion.khu.website.member.dto.MemberResponse;
import likelion.khu.website.member.dto.MemberUpdateRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class MemberServiceTest {

    @Autowired MemberService memberService;
    @Autowired MemberRepository memberRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private MemberCreateRequest sampleRequest() {
        MemberCreateRequest req = new MemberCreateRequest();
        req.setName("시현");
        req.setRoles(Set.of(MemberRole.BACKEND));
        req.setCohort(13);
        req.setStudentId("2020000001");
        req.setPhone("01000000001");
        req.setPublicationConsent(true);
        req.setPublicationConsentedAt(LocalDateTime.of(2026, 7, 1, 12, 0));
        return req;
    }

    @Test
    void create_AssignsRandomEmoji() {
        MemberAdminResponse res = memberService.create(sampleRequest(), "admin@likelion.org");

        assertThat(res.getEmoji()).isNotBlank();
        assertThat(MemberService.EMOJI_POOL).contains(res.getEmoji());
    }

    @Test
    void create_SetsInitialPasswordFromPhoneAndRequiresChange() {
        memberService.create(sampleRequest(), "admin@likelion.org");

        Member saved = memberRepository.findAllByStudentId("2020000001").get(0);
        assertThat(saved.isMustChangePassword()).isTrue();
        assertThat(passwordEncoder.matches("01000000001", saved.getPasswordHash())).isTrue();
    }

    // 학번 중복 시 409는 MemberControllerTest.createMember_DuplicateStudentId_Returns409가
    // 실제 HTTP 상태코드까지 더 강하게 검증한다 — 여기선 중복 검증하지 않는다.

    @Test
    void create_StoresCreatedBy() {
        memberService.create(sampleRequest(), "admin@likelion.org");

        Member saved = memberRepository.findAll().get(0);
        assertThat(saved.getCreatedBy()).isEqualTo("admin@likelion.org");
        assertThat(saved.getUpdatedBy()).isEqualTo("admin@likelion.org");
    }

    @Test
    void create_CohortIsImmutable_NotInUpdateDto() {
        MemberAdminResponse created = memberService.create(sampleRequest(), "admin@likelion.org");

        MemberUpdateRequest update = new MemberUpdateRequest();
        update.setName("시현(수정)");
        MemberAdminResponse updated = memberService.update(created.getId(), update, "admin@likelion.org");

        assertThat(updated.getCohort()).isEqualTo(13);
    }

    @Test
    void create_EmojiIsImmutable_NotInUpdateDto() {
        MemberAdminResponse created = memberService.create(sampleRequest(), "admin@likelion.org");
        String originalEmoji = created.getEmoji();

        MemberUpdateRequest update = new MemberUpdateRequest();
        update.setName("시현(수정)");
        MemberAdminResponse updated = memberService.update(created.getId(), update, "admin@likelion.org");

        assertThat(updated.getEmoji()).isEqualTo(originalEmoji);
    }

    @Test
    void getAll_OrderedByCreatedAtAsc() {
        MemberCreateRequest req1 = sampleRequest();
        req1.setName("첫째");
        MemberCreateRequest req2 = sampleRequest();
        req2.setName("둘째");
        req2.setStudentId("2020000002");
        req2.setPhone("01000000002");
        memberService.create(req1, "admin@likelion.org");
        memberService.create(req2, "admin@likelion.org");

        List<MemberResponse> all = memberService.getAll();

        assertThat(all).hasSize(2);
        assertThat(all.get(0).getName()).isEqualTo("첫째");
        assertThat(all.get(1).getName()).isEqualTo("둘째");
    }

    @Test
    void getAll_OnlyReturnsConsentedActiveMembers() {
        MemberCreateRequest publicMember = sampleRequest();
        memberService.create(publicMember, "admin@likelion.org");

        MemberCreateRequest privateMember = sampleRequest();
        privateMember.setStudentId("2020000002");
        privateMember.setPhone("01000000002");
        privateMember.setPublicationConsent(false);
        privateMember.setPublicationConsentedAt(null);
        memberService.create(privateMember, "admin@likelion.org");

        List<MemberResponse> all = memberService.getAll();

        assertThat(all).hasSize(1);
        assertThat(all.get(0).getName()).isEqualTo("시현");
    }

    @Test
    void update_StoresDepartmentAndPublicationConsentEvidence() {
        MemberAdminResponse created = memberService.create(sampleRequest(), "admin@likelion.org");
        LocalDateTime changedAt = LocalDateTime.of(2026, 7, 2, 13, 30);

        MemberUpdateRequest update = new MemberUpdateRequest();
        update.setDepartment("소프트웨어융합학과");
        update.setPublicationConsent(true);
        update.setPublicationConsentedAt(changedAt);
        MemberAdminResponse updated = memberService.update(created.getId(), update, "admin@likelion.org");

        assertThat(updated.getDepartment()).isEqualTo("소프트웨어융합학과");
        assertThat(updated.isPublicationConsent()).isTrue();
        assertThat(updated.getPublicationConsentedAt()).isEqualTo(changedAt);
    }

    @Test
    void update_PartialUpdate_OnlyChangesProvidedFields() {
        MemberCreateRequest createReq = sampleRequest();
        createReq.setPhotoUrl("https://example.com/photo.jpg");
        createReq.setJoinReason("개발이 좋아서");
        MemberAdminResponse created = memberService.create(createReq, "admin@likelion.org");

        MemberUpdateRequest update = new MemberUpdateRequest();
        update.setName("시현(수정)");
        MemberAdminResponse updated = memberService.update(created.getId(), update, "admin@likelion.org");

        assertThat(updated.getName()).isEqualTo("시현(수정)");
        assertThat(updated.getPhotoUrl()).isEqualTo("https://example.com/photo.jpg");
        assertThat(updated.getJoinReason()).isEqualTo("개발이 좋아서");
    }

    // 존재하지 않는 id 404는 MemberControllerTest.updateMember_NonExistentId_Returns404가
    // 실제 HTTP 상태코드까지 더 강하게 검증한다 — 여기선 중복 검증하지 않는다.

    @Test
    void update_UpdatesUpdatedBy() {
        MemberAdminResponse created = memberService.create(sampleRequest(), "admin@likelion.org");

        MemberUpdateRequest update = new MemberUpdateRequest();
        update.setName("수정됨");
        memberService.update(created.getId(), update, "other@likelion.org");

        Member saved = memberRepository.findById(created.getId()).orElseThrow();
        assertThat(saved.getUpdatedBy()).isEqualTo("other@likelion.org");
        assertThat(saved.getCreatedBy()).isEqualTo("admin@likelion.org");
    }

    @Test
    void create_RolesAreStoredCorrectly() {
        MemberCreateRequest req = sampleRequest();
        req.setRoles(Set.of(MemberRole.BACKEND, MemberRole.PRESIDENT));
        MemberAdminResponse res = memberService.create(req, "admin@likelion.org");

        assertThat(res.getRoles()).containsExactlyInAnyOrder(MemberRole.BACKEND, MemberRole.PRESIDENT);
    }

    @Test
    void update_EmptyPhotoUrl_ClearsPhoto() {
        MemberCreateRequest createReq = sampleRequest();
        createReq.setPhotoUrl("https://example.com/photo.jpg");
        MemberAdminResponse created = memberService.create(createReq, "admin@likelion.org");

        MemberUpdateRequest update = new MemberUpdateRequest();
        update.setPhotoUrl("");
        MemberAdminResponse updated = memberService.update(created.getId(), update, "admin@likelion.org");

        assertThat(updated.getPhotoUrl()).isNull();
    }

    @Test
    void update_NullPhotoUrl_KeepsExistingPhoto() {
        MemberCreateRequest createReq = sampleRequest();
        createReq.setPhotoUrl("https://example.com/photo.jpg");
        MemberAdminResponse created = memberService.create(createReq, "admin@likelion.org");

        MemberUpdateRequest update = new MemberUpdateRequest();
        update.setName("이름만바꿈");
        MemberAdminResponse updated = memberService.update(created.getId(), update, "admin@likelion.org");

        assertThat(updated.getPhotoUrl()).isEqualTo("https://example.com/photo.jpg");
    }

    @Test
    void update_Roles_ReplacesExistingRoles() {
        MemberAdminResponse created = memberService.create(sampleRequest(), "admin@likelion.org");

        MemberUpdateRequest update = new MemberUpdateRequest();
        update.setRoles(Set.of(MemberRole.FRONTEND, MemberRole.VICE_PRESIDENT));
        MemberAdminResponse updated = memberService.update(created.getId(), update, "admin@likelion.org");

        assertThat(updated.getRoles()).containsExactlyInAnyOrder(MemberRole.FRONTEND, MemberRole.VICE_PRESIDENT);
    }

    @Test
    void getAllForAdmin_IncludesStudentIdAndOffboardedFlag() {
        memberService.create(sampleRequest(), "admin@likelion.org");

        List<MemberAdminResponse> all = memberService.getAllForAdmin();

        assertThat(all).hasSize(1);
        assertThat(all.get(0).getStudentId()).isEqualTo("2020000001");
        assertThat(all.get(0).isOffboarded()).isFalse();
    }
}
