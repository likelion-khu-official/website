package likelion.khu.website.project;

import likelion.khu.website.admin.auth.AdminPrincipal;
import likelion.khu.website.member.Member;
import likelion.khu.website.member.MemberRepository;
import likelion.khu.website.member.MemberRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class ProjectControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired MemberRepository memberRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private Member createMember(String studentId, String name) {
        Member member = Member.create(
                name, Set.of(MemberRole.BE), 13, "🦁", null, null, "admin@likelion.org",
                studentId, "01000000000", passwordEncoder.encode("01000000000"));
        return memberRepository.save(member);
    }

    private String createRequestJson(Long participantId) {
        return """
                {"title":"멋사 홈페이지","summary":"동아리 소개 사이트","cohort":13,
                 "techStack":["Spring","React"],"githubUrl":"https://github.com/likelion-khu",
                 "images":[{"url":"https://img/1.png","representative":true}],
                 "participants":[{"memberId":%d,"part":"BE"}]}
                """.formatted(participantId);
    }

    // ── GET /api/projects ────────────────────────────────────────────

    @Test
    void list_Public_ExcludesHiddenProjects() throws Exception {
        Member member = createMember("2020000001", "시현");
        Long id = createProject(member.getId());
        hideProject(id);

        mockMvc.perform(get("/api/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void list_Public_ReturnsRepresentativeImageUrl() throws Exception {
        Member member = createMember("2020000002", "시현");
        createProject(member.getId());

        mockMvc.perform(get("/api/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].representativeImageUrl").value("https://img/1.png"))
                .andExpect(jsonPath("$[0].title").value("멋사 홈페이지"));
    }

    // ── GET /api/projects/{id} ───────────────────────────────────────

    @Test
    void get_Public_ReturnsImagesAndParticipants() throws Exception {
        Member member = createMember("2020000003", "시현");
        Long id = createProject(member.getId());

        mockMvc.perform(get("/api/projects/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.images.length()").value(1))
                .andExpect(jsonPath("$.participants.length()").value(1))
                .andExpect(jsonPath("$.participants[0].name").value("시현"))
                .andExpect(jsonPath("$.participants[0].part").value("BE"));
    }

    @Test
    void get_HiddenProject_Returns404() throws Exception {
        Member member = createMember("2020000004", "시현");
        Long id = createProject(member.getId());
        hideProject(id);

        mockMvc.perform(get("/api/projects/{id}", id))
                .andExpect(status().isNotFound());
    }

    @Test
    void get_NonExistentId_Returns404() throws Exception {
        mockMvc.perform(get("/api/projects/{id}", 9999L))
                .andExpect(status().isNotFound());
    }

    // ── POST /api/projects ───────────────────────────────────────────

    @Test
    void create_AsParticipant_Returns201() throws Exception {
        Member member = createMember("2020000005", "시현");

        mockMvc.perform(withMemberAuth(post("/api/projects"), member.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createRequestJson(member.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("멋사 홈페이지"))
                .andExpect(jsonPath("$.participants[0].memberId").value(member.getId()));
    }

    @Test
    void create_WithoutSelfInParticipants_Returns400() throws Exception {
        Member creator = createMember("2020000006", "시현");
        Member other = createMember("2020000007", "찬욱");

        mockMvc.perform(withMemberAuth(post("/api/projects"), creator.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createRequestJson(other.getId())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_TwoRepresentativeImages_Returns400() throws Exception {
        Member member = createMember("2020000008", "시현");
        String body = """
                {"title":"t","summary":"s","cohort":13,
                 "images":[{"url":"u1","representative":true},{"url":"u2","representative":true}],
                 "participants":[{"memberId":%d,"part":"BE"}]}
                """.formatted(member.getId());

        mockMvc.perform(withMemberAuth(post("/api/projects"), member.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_NotMemberRole_Returns403() throws Exception {
        mockMvc.perform(withAdminAuth(post("/api/projects"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createRequestJson(1L)))
                .andExpect(status().isForbidden());
    }

    @Test
    void create_Unauthenticated_Returns401() throws Exception {
        mockMvc.perform(post("/api/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createRequestJson(1L)))
                .andExpect(status().isUnauthorized());
    }

    // 상태공간트리 QA — "정확히 1장"이라 2장 초과뿐 아니라 0장(전부 false)도 막혀야 한다.
    @Test
    void create_NoRepresentativeImage_Returns400() throws Exception {
        Member member = createMember("2020000018", "시현");
        String body = """
                {"title":"t","summary":"s","cohort":13,
                 "images":[{"url":"u1","representative":false}],
                 "participants":[{"memberId":%d,"part":"BE"}]}
                """.formatted(member.getId());

        mockMvc.perform(withMemberAuth(post("/api/projects"), member.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    // 상태공간트리 QA — 참여자로 등록하려는 memberId가 실제로 존재하지 않으면 404.
    @Test
    void create_NonExistentParticipantMemberId_Returns404() throws Exception {
        Member member = createMember("2020000019", "시현");
        String body = """
                {"title":"t","summary":"s","cohort":13,
                 "participants":[{"memberId":%d,"part":"BE"},{"memberId":9999,"part":"FE"}]}
                """.formatted(member.getId());

        mockMvc.perform(withMemberAuth(post("/api/projects"), member.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound());
    }

    // 상태공간트리 QA — 같은 memberId를 참여자 목록에 두 번 넣으면 유니크 제약이 없어
    // ProjectParticipant 행이 중복 저장될 수 있었다 — 요청 단계에서 막는다.
    @Test
    void create_DuplicateParticipant_Returns400() throws Exception {
        Member member = createMember("2020000035", "시현");
        String body = """
                {"title":"t","summary":"s","cohort":13,
                 "participants":[{"memberId":%d,"part":"BE"},{"memberId":%d,"part":"FE"}]}
                """.formatted(member.getId(), member.getId());

        mockMvc.perform(withMemberAuth(post("/api/projects"), member.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    // 상태공간트리 QA — mustChangePassword=true인 멤버는 프로젝트를 등록할 수 없어야 한다.
    // MemberPasswordGuardFilter가 "/api/member/" 네임스페이스만 보던 구버전에선 이 요청이
    // 통과됐다(#119 리뷰에서 발견) — 가드를 "쓰기 메서드 기반"으로 일반화한 뒤 막히는지 확인.
    @Test
    void create_MustChangePasswordMember_Returns403() throws Exception {
        Member member = createMember("2020000020", "시현");

        mockMvc.perform(withMustChangePasswordMemberAuth(post("/api/projects"), member.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createRequestJson(member.getId())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MUST_CHANGE_PASSWORD"));
    }

    // ── PATCH /api/projects/{id} ──────────────────────────────────────

    @Test
    void update_ByParticipant_Returns200() throws Exception {
        Member member = createMember("2020000009", "시현");
        Long id = createProject(member.getId());

        mockMvc.perform(withMemberAuth(patch("/api/projects/{id}", id), member.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"수정된 제목\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("수정된 제목"));
    }

    // 상태공간트리 QA — 공동 소유 축. requireParticipant()가 "참여자 집합에 있는가"를 정확히
    // 보는지, 우연히 "첫 참여자(=만든 사람)인가"만 보는 실수는 없는지는 참여자가 2명 이상일 때만
    // 드러난다 — 지금까진 모든 테스트가 참여자 1명(만든 사람 본인)짜리 프로젝트만 썼다.
    @Test
    void update_ByCoParticipantWhoIsNotCreator_Returns200() throws Exception {
        Member creator = createMember("2020000031", "시현");
        Member coParticipant = createMember("2020000032", "찬욱");
        Long id = createProjectWithTwoParticipants(creator.getId(), coParticipant.getId());

        mockMvc.perform(withMemberAuth(patch("/api/projects/{id}", id), coParticipant.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"공동참여자가 수정\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("공동참여자가 수정"));
    }

    @Test
    void update_ByNonParticipant_Returns403() throws Exception {
        Member owner = createMember("2020000010", "시현");
        Member stranger = createMember("2020000011", "다른사람");
        Long id = createProject(owner.getId());

        mockMvc.perform(withMemberAuth(patch("/api/projects/{id}", id), stranger.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"수정시도\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void update_EmptyParticipants_Returns400() throws Exception {
        Member member = createMember("2020000012", "시현");
        Long id = createProject(member.getId());

        mockMvc.perform(withMemberAuth(patch("/api/projects/{id}", id), member.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"participants\":[]}"))
                .andExpect(status().isBadRequest());
    }

    // 상태공간트리 QA — 참여자 목록을 통째로 교체하면서 요청자 본인을 빼면, 다음부턴 자기가
    // 만든 프로젝트인데도 스스로 못 고치는 상태가 된다 — ProjectService.update()에 create()와
    // 같은 본인포함 검증을 추가한 수정의 회귀 테스트.
    @Test
    void update_RemovesSelfFromParticipants_Returns400() throws Exception {
        Member member = createMember("2020000021", "시현");
        Member other = createMember("2020000022", "다른사람");
        Long id = createProject(member.getId());

        mockMvc.perform(withMemberAuth(patch("/api/projects/{id}", id), member.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"participants\":[{\"memberId\":%d,\"part\":\"FE\"}]}".formatted(other.getId())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void update_Unauthenticated_Returns401() throws Exception {
        Member member = createMember("2020000023", "시현");
        Long id = createProject(member.getId());

        mockMvc.perform(patch("/api/projects/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"수정시도\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void update_NonExistentId_Returns404() throws Exception {
        Member member = createMember("2020000024", "시현");

        mockMvc.perform(withMemberAuth(patch("/api/projects/{id}", 9999L), member.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"수정시도\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void update_NoRepresentativeImage_Returns400() throws Exception {
        Member member = createMember("2020000025", "시현");
        Long id = createProject(member.getId());

        mockMvc.perform(withMemberAuth(patch("/api/projects/{id}", id), member.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"images\":[{\"url\":\"u1\",\"representative\":false}]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void update_DuplicateParticipant_Returns400() throws Exception {
        Member member = createMember("2020000036", "시현");
        Long id = createProject(member.getId());

        mockMvc.perform(withMemberAuth(patch("/api/projects/{id}", id), member.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"participants\":[{\"memberId\":%d,\"part\":\"BE\"},{\"memberId\":%d,\"part\":\"FE\"}]}"
                                .formatted(member.getId(), member.getId())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void update_MustChangePasswordMember_Returns403() throws Exception {
        Member member = createMember("2020000026", "시현");
        Long id = createProject(member.getId());

        mockMvc.perform(withMustChangePasswordMemberAuth(patch("/api/projects/{id}", id), member.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"수정시도\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MUST_CHANGE_PASSWORD"));
    }

    // ── DELETE /api/projects/{id} ─────────────────────────────────────

    @Test
    void delete_ByParticipant_Returns200() throws Exception {
        Member member = createMember("2020000013", "시현");
        Long id = createProject(member.getId());

        mockMvc.perform(withMemberAuth(delete("/api/projects/{id}", id), member.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/projects/{id}", id))
                .andExpect(status().isNotFound());
    }

    // 상태공간트리 QA — 공동 소유 축(delete 버전).
    @Test
    void delete_ByCoParticipantWhoIsNotCreator_Returns200() throws Exception {
        Member creator = createMember("2020000033", "시현");
        Member coParticipant = createMember("2020000034", "찬욱");
        Long id = createProjectWithTwoParticipants(creator.getId(), coParticipant.getId());

        mockMvc.perform(withMemberAuth(delete("/api/projects/{id}", id), coParticipant.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void delete_ByNonParticipant_Returns403() throws Exception {
        Member owner = createMember("2020000014", "시현");
        Member stranger = createMember("2020000015", "다른사람");
        Long id = createProject(owner.getId());

        mockMvc.perform(withMemberAuth(delete("/api/projects/{id}", id), stranger.getId()))
                .andExpect(status().isForbidden());
    }

    @Test
    void delete_Unauthenticated_Returns401() throws Exception {
        Member member = createMember("2020000027", "시현");
        Long id = createProject(member.getId());

        mockMvc.perform(delete("/api/projects/{id}", id))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void delete_NonExistentId_Returns404() throws Exception {
        Member member = createMember("2020000028", "시현");

        mockMvc.perform(withMemberAuth(delete("/api/projects/{id}", 9999L), member.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    void delete_MustChangePasswordMember_Returns403() throws Exception {
        Member member = createMember("2020000029", "시현");
        Long id = createProject(member.getId());

        mockMvc.perform(withMustChangePasswordMemberAuth(delete("/api/projects/{id}", id), member.getId()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MUST_CHANGE_PASSWORD"));
    }

    // ── PATCH /api/admin/projects/{id}/hidden ─────────────────────────

    @Test
    void hidden_ByAdmin_HidesFromPublicButKeptInStorage() throws Exception {
        Member member = createMember("2020000016", "시현");
        Long id = createProject(member.getId());

        mockMvc.perform(withAdminAuth(patch("/api/admin/projects/{id}/hidden", id))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"hidden\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/projects/{id}", id)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/projects")).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void hidden_ByMember_Returns403() throws Exception {
        Member member = createMember("2020000017", "시현");
        Long id = createProject(member.getId());

        mockMvc.perform(withMemberAuth(patch("/api/admin/projects/{id}/hidden", id), member.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"hidden\":true}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void hidden_Unauthenticated_Returns401() throws Exception {
        Member member = createMember("2020000030", "시현");
        Long id = createProject(member.getId());

        mockMvc.perform(patch("/api/admin/projects/{id}/hidden", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"hidden\":true}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void hidden_NonExistentId_Returns404() throws Exception {
        mockMvc.perform(withAdminAuth(patch("/api/admin/projects/{id}/hidden", 9999L))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"hidden\":true}"))
                .andExpect(status().isNotFound());
    }

    // ── 데이터 격리 불변식 (Actor×Endpoint 트리가 아니라 별도 체크) ──────────────
    // deleteAllByProjectId류 메서드가 projectId로 정확히 스코핑되는지 — 상태공간트리엔
    // 안 넣었다(요청자가 누구인지와 무관한, "리소스가 여럿일 때 서로 안 섞이는가"라는
    // 별개의 성격 질문이라). 두 프로젝트를 만들고 하나만 건드려서 다른 하나가 그대로인지 본다.

    @Test
    void delete_DoesNotAffectOtherProjectsImagesOrParticipants() throws Exception {
        Member member = createMember("2020000037", "시현");
        Long keptId = createProject(member.getId());
        Long deletedId = createProject(member.getId());

        mockMvc.perform(withMemberAuth(delete("/api/projects/{id}", deletedId), member.getId()))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/projects/{id}", keptId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.images.length()").value(1))
                .andExpect(jsonPath("$.participants.length()").value(1));
    }

    @Test
    void update_ImagesAndParticipantReplace_DoesNotAffectOtherProjects() throws Exception {
        Member member = createMember("2020000038", "시현");
        Member other = createMember("2020000039", "다른사람");
        Long untouchedId = createProject(member.getId());
        Long updatedId = createProjectWithTwoParticipants(member.getId(), other.getId());

        mockMvc.perform(withMemberAuth(patch("/api/projects/{id}", updatedId), member.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"participants\":[{\"memberId\":%d,\"part\":\"BE\"}]}".formatted(member.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.participants.length()").value(1));

        mockMvc.perform(get("/api/projects/{id}", untouchedId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.participants.length()").value(1))
                .andExpect(jsonPath("$.participants[0].memberId").value(member.getId()));
    }

    // ── helpers ────────────────────────────────────────────────────────

    private Long createProject(Long memberId) throws Exception {
        String response = mockMvc.perform(withMemberAuth(post("/api/projects"), memberId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createRequestJson(memberId)))
                .andReturn().getResponse().getContentAsString();
        return objectMapperReadId(response);
    }

    // 공동 소유(참여자가 여럿) 시나리오 전용 — creatorMemberId가 요청을 보내지만
    // coParticipantMemberId도 처음부터 참여자 목록에 포함된 프로젝트를 만든다.
    private Long createProjectWithTwoParticipants(Long creatorMemberId, Long coParticipantMemberId) throws Exception {
        String body = """
                {"title":"멋사 홈페이지","summary":"동아리 소개 사이트","cohort":13,
                 "participants":[{"memberId":%d,"part":"BE"},{"memberId":%d,"part":"FE"}]}
                """.formatted(creatorMemberId, coParticipantMemberId);
        String response = mockMvc.perform(withMemberAuth(post("/api/projects"), creatorMemberId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn().getResponse().getContentAsString();
        return objectMapperReadId(response);
    }

    private void hideProject(Long id) throws Exception {
        mockMvc.perform(withAdminAuth(patch("/api/admin/projects/{id}/hidden", id))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"hidden\":true}"));
    }

    private Long objectMapperReadId(String json) {
        Matcher matcher = Pattern.compile("\"id\":(\\d+)").matcher(json);
        matcher.find();
        return Long.valueOf(matcher.group(1));
    }

    private MockHttpServletRequestBuilder withMemberAuth(MockHttpServletRequestBuilder builder, Long memberId) {
        return builder.with(SecurityMockMvcRequestPostProcessors.authentication(memberAuthentication(memberId)));
    }

    // 상태공간트리 QA — mustChangePassword=true인 멤버가 쓰기 요청을 보내면
    // MemberPasswordGuardFilter가 role 체크보다 먼저 막아야 한다.
    private MockHttpServletRequestBuilder withMustChangePasswordMemberAuth(
            MockHttpServletRequestBuilder builder, Long memberId) {
        AdminPrincipal principal = new AdminPrincipal(memberId, "student", "MEMBER", true);
        Authentication auth = new UsernamePasswordAuthenticationToken(
                principal, null, List.of(new SimpleGrantedAuthority("ROLE_MEMBER")));
        return builder.with(SecurityMockMvcRequestPostProcessors.authentication(auth));
    }

    private MockHttpServletRequestBuilder withAdminAuth(MockHttpServletRequestBuilder builder) {
        return builder.with(SecurityMockMvcRequestPostProcessors.authentication(adminAuthentication()));
    }

    private Authentication memberAuthentication(Long memberId) {
        AdminPrincipal principal = new AdminPrincipal(memberId, "student", "MEMBER", false);
        return new UsernamePasswordAuthenticationToken(
                principal, null, List.of(new SimpleGrantedAuthority("ROLE_MEMBER")));
    }

    private Authentication adminAuthentication() {
        AdminPrincipal principal = new AdminPrincipal(1L, "admin@khu.ac.kr", "SUPER_ADMIN", false);
        return new UsernamePasswordAuthenticationToken(
                principal, null, List.of(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN")));
    }
}
