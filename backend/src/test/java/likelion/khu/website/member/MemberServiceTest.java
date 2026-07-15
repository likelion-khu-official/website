package likelion.khu.website.member;

import likelion.khu.website.member.dto.MemberCreateRequest;
import likelion.khu.website.member.dto.MemberResponse;
import likelion.khu.website.member.dto.MemberUpdateRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class MemberServiceTest {

    @Autowired MemberService memberService;
    @Autowired MemberRepository memberRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private MemberCreateRequest sampleRequest() {
        MemberCreateRequest req = new MemberCreateRequest();
        req.setName("시현");
        req.setRoles(Set.of(MemberRole.BE));
        req.setCohort(13);
        req.setStudentId("2020000001");
        req.setPhone("01000000001");
        return req;
    }

    @Test
    void create_AssignsRandomEmoji() {
        MemberResponse res = memberService.create(sampleRequest(), "admin@likelion.org");

        assertThat(res.getEmoji()).isNotBlank();
        assertThat(MemberService.EMOJI_POOL).contains(res.getEmoji());
    }

    @Test
    void create_SetsInitialPasswordFromPhoneAndRequiresChange() {
        memberService.create(sampleRequest(), "admin@likelion.org");

        Member saved = memberRepository.findByStudentId("2020000001").orElseThrow();
        assertThat(saved.isMustChangePassword()).isTrue();
        assertThat(passwordEncoder.matches("01000000001", saved.getPasswordHash())).isTrue();
    }

    @Test
    void create_DuplicateStudentId_ThrowsConflict() {
        memberService.create(sampleRequest(), "admin@likelion.org");

        assertThatThrownBy(() -> memberService.create(sampleRequest(), "admin@likelion.org"))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void create_StoresCreatedBy() {
        memberService.create(sampleRequest(), "admin@likelion.org");

        Member saved = memberRepository.findAll().get(0);
        assertThat(saved.getCreatedBy()).isEqualTo("admin@likelion.org");
        assertThat(saved.getUpdatedBy()).isEqualTo("admin@likelion.org");
    }

    @Test
    void create_CohortIsImmutable_NotInUpdateDto() {
        MemberResponse created = memberService.create(sampleRequest(), "admin@likelion.org");

        MemberUpdateRequest update = new MemberUpdateRequest();
        update.setName("시현(수정)");
        MemberResponse updated = memberService.update(created.getId(), update, "admin@likelion.org");

        assertThat(updated.getCohort()).isEqualTo(13);
    }

    @Test
    void create_EmojiIsImmutable_NotInUpdateDto() {
        MemberResponse created = memberService.create(sampleRequest(), "admin@likelion.org");
        String originalEmoji = created.getEmoji();

        MemberUpdateRequest update = new MemberUpdateRequest();
        update.setName("시현(수정)");
        MemberResponse updated = memberService.update(created.getId(), update, "admin@likelion.org");

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
    void update_PartialUpdate_OnlyChangesProvidedFields() {
        MemberCreateRequest createReq = sampleRequest();
        createReq.setPhotoUrl("https://example.com/photo.jpg");
        createReq.setJoinReason("개발이 좋아서");
        MemberResponse created = memberService.create(createReq, "admin@likelion.org");

        MemberUpdateRequest update = new MemberUpdateRequest();
        update.setName("시현(수정)");
        MemberResponse updated = memberService.update(created.getId(), update, "admin@likelion.org");

        assertThat(updated.getName()).isEqualTo("시현(수정)");
        assertThat(updated.getPhotoUrl()).isEqualTo("https://example.com/photo.jpg");
        assertThat(updated.getJoinReason()).isEqualTo("개발이 좋아서");
    }

    @Test
    void update_NonExistentId_ThrowsNotFound() {
        MemberUpdateRequest update = new MemberUpdateRequest();
        update.setName("없는사람");

        assertThatThrownBy(() -> memberService.update(9999L, update, "admin@likelion.org"))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void update_UpdatesUpdatedBy() {
        MemberResponse created = memberService.create(sampleRequest(), "admin@likelion.org");

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
        req.setRoles(Set.of(MemberRole.BE, MemberRole.PM));
        MemberResponse res = memberService.create(req, "admin@likelion.org");

        assertThat(res.getRoles()).containsExactlyInAnyOrder(MemberRole.BE, MemberRole.PM);
    }

    @Test
    void update_EmptyPhotoUrl_ClearsPhoto() {
        MemberCreateRequest createReq = sampleRequest();
        createReq.setPhotoUrl("https://example.com/photo.jpg");
        MemberResponse created = memberService.create(createReq, "admin@likelion.org");

        MemberUpdateRequest update = new MemberUpdateRequest();
        update.setPhotoUrl("");
        MemberResponse updated = memberService.update(created.getId(), update, "admin@likelion.org");

        assertThat(updated.getPhotoUrl()).isNull();
    }

    @Test
    void update_NullPhotoUrl_KeepsExistingPhoto() {
        MemberCreateRequest createReq = sampleRequest();
        createReq.setPhotoUrl("https://example.com/photo.jpg");
        MemberResponse created = memberService.create(createReq, "admin@likelion.org");

        MemberUpdateRequest update = new MemberUpdateRequest();
        update.setName("이름만바꿈");
        MemberResponse updated = memberService.update(created.getId(), update, "admin@likelion.org");

        assertThat(updated.getPhotoUrl()).isEqualTo("https://example.com/photo.jpg");
    }

    @Test
    void update_Roles_ReplacesExistingRoles() {
        MemberResponse created = memberService.create(sampleRequest(), "admin@likelion.org");

        MemberUpdateRequest update = new MemberUpdateRequest();
        update.setRoles(Set.of(MemberRole.FE, MemberRole.PM));
        MemberResponse updated = memberService.update(created.getId(), update, "admin@likelion.org");

        assertThat(updated.getRoles()).containsExactlyInAnyOrder(MemberRole.FE, MemberRole.PM);
    }
}
