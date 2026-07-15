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

    @Test
    void delete_ByNonParticipant_Returns403() throws Exception {
        Member owner = createMember("2020000014", "시현");
        Member stranger = createMember("2020000015", "다른사람");
        Long id = createProject(owner.getId());

        mockMvc.perform(withMemberAuth(delete("/api/projects/{id}", id), stranger.getId()))
                .andExpect(status().isForbidden());
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

    // ── helpers ────────────────────────────────────────────────────────

    private Long createProject(Long memberId) throws Exception {
        String response = mockMvc.perform(withMemberAuth(post("/api/projects"), memberId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createRequestJson(memberId)))
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
