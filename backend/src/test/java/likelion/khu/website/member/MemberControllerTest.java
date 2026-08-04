package likelion.khu.website.member;

import likelion.khu.website.admin.WithMockAdminUser;
import likelion.khu.website.member.auth.MemberAuthService;
import likelion.khu.website.member.dto.MemberAdminResponse;
import likelion.khu.website.member.dto.MemberCreateRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class MemberControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired MemberService memberService;
    @Autowired MemberAuthService memberAuthService;

    private Long createMember() {
        MemberCreateRequest req = new MemberCreateRequest();
        req.setName("시현");
        req.setRoles(Set.of(MemberRole.BACKEND));
        req.setCohort(13);
        req.setStudentId("2020123456");
        req.setPhone("01000000000");
        req.setPublicationConsent(true);
        req.setPublicationConsentedAt(LocalDateTime.of(2026, 7, 1, 12, 0));
        MemberAdminResponse res = memberService.create(req, "admin@likelion.org");
        return res.getId();
    }

    // ── GET /api/members ─────────────────────────────────────────────

    @Test
    void listMembers_Public_Returns200() throws Exception {
        createMember();

        mockMvc.perform(get("/api/members"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("시현"))
                .andExpect(jsonPath("$[0].emoji").isNotEmpty())
                .andExpect(jsonPath("$[0].cohort").value(13));
    }

    @Test
    void listMembers_DoesNotExposeCreatedBy() throws Exception {
        createMember();

        mockMvc.perform(get("/api/members"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].createdBy").doesNotExist())
                .andExpect(jsonPath("$[0].updatedBy").doesNotExist())
                .andExpect(jsonPath("$[0].studentId").doesNotExist())
                .andExpect(jsonPath("$[0].phone").doesNotExist())
                .andExpect(jsonPath("$[0].publicationConsent").doesNotExist())
                .andExpect(jsonPath("$[0].publicationConsentedAt").doesNotExist());
    }

    // ── POST /api/admin/members ───────────────────────────────────────

    @WithMockAdminUser
    @Test
    void createMember_Admin_Returns201() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"선우\",\"roles\":[\"BACKEND\"],\"cohort\":13,\"studentId\":\"2020111111\",\"phone\":\"01011112222\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("선우"))
                .andExpect(jsonPath("$.cohort").value(13))
                .andExpect(jsonPath("$.emoji").isNotEmpty())
                .andExpect(jsonPath("$.publicationConsent").value(true))
                .andExpect(jsonPath("$.publicationConsentedAt").isNotEmpty())
                .andExpect(jsonPath("$.phone").doesNotExist())
                .andExpect(jsonPath("$.createdBy").doesNotExist());

        mockMvc.perform(get("/api/members"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("선우"));
    }

    @WithMockAdminUser
    @Test
    void createMember_ConsentWithoutTimestamp_Returns400() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"선우\",\"roles\":[\"BACKEND\"],\"cohort\":13," +
                                "\"studentId\":\"2020111111\",\"phone\":\"01011112222\"," +
                                "\"publicationConsent\":true}"))
                .andExpect(status().isBadRequest());
    }

    // 위키 "정보구조와 권한" 기준 — 등록은 모든 관리자가 쓸 수 있는 공용 권한이다(#145).
    @WithMockAdminUser(role = "ADMIN")
    @Test
    void createMember_ByAdmin_Returns201() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"선우\",\"roles\":[\"BACKEND\"],\"cohort\":13,\"studentId\":\"2020111111\",\"phone\":\"01011112222\"}"))
                .andExpect(status().isCreated());
    }

    @WithMockUser(roles = "MEMBER")
    @Test
    void createMember_ByMember_Returns403() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"선우\",\"roles\":[\"BACKEND\"],\"cohort\":13,\"studentId\":\"2020111111\",\"phone\":\"01011112222\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void createMember_Unauthenticated_Returns4xx() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"선우\",\"roles\":[\"BACKEND\"],\"cohort\":13,\"studentId\":\"2020111111\",\"phone\":\"01011112222\"}"))
                .andExpect(status().is4xxClientError());
    }

    @WithMockUser(roles = "ADMIN")
    @Test
    void createMember_MissingName_Returns400() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roles\":[\"BE\"],\"cohort\":13,\"studentId\":\"2020111111\",\"phone\":\"01011112222\"}"))
                .andExpect(status().isBadRequest());
    }

    @WithMockUser(roles = "ADMIN")
    @Test
    void createMember_MissingRoles_Returns400() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"선우\",\"cohort\":13,\"studentId\":\"2020111111\",\"phone\":\"01011112222\"}"))
                .andExpect(status().isBadRequest());
    }

    @WithMockUser(roles = "ADMIN")
    @Test
    void createMember_MissingCohort_Returns400() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"선우\",\"roles\":[\"BE\"],\"studentId\":\"2020111111\",\"phone\":\"01011112222\"}"))
                .andExpect(status().isBadRequest());
    }

    @WithMockUser(roles = "ADMIN")
    @Test
    void createMember_MissingStudentId_Returns400() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"선우\",\"roles\":[\"BE\"],\"cohort\":13,\"phone\":\"01011112222\"}"))
                .andExpect(status().isBadRequest());
    }

    @WithMockAdminUser
    @Test
    void createMember_DuplicateStudentId_Returns409() throws Exception {
        createMember();

        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"또다른시현\",\"roles\":[\"BACKEND\"],\"cohort\":13,\"studentId\":\"2020123456\",\"phone\":\"01099998888\"}"))
                .andExpect(status().isConflict());
    }

    // 한 사람이 동시에 두 기수로 활동 중일 순 없다 — 기수가 달라도 이미 활동 중인 학번이면 막는다(#155 리뷰).
    @WithMockAdminUser
    @Test
    void createMember_SameStudentIdDifferentCohortWhileStillActive_Returns409() throws Exception {
        createMember();

        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"또다른시현\",\"roles\":[\"BACKEND\"],\"cohort\":14,\"studentId\":\"2020123456\",\"phone\":\"01099998888\"}"))
                .andExpect(status().isConflict());
    }

    // 14기로 활동하다 오프보딩된 뒤 15기로 재입부하는 시나리오(#155 리뷰) — 같은 학번이라도
    // 기수가 다르면 새로 등록할 수 있어야 한다.
    @WithMockAdminUser
    @Test
    void createMember_SameStudentIdNewCohortAfterOffboarding_Returns201() throws Exception {
        Long oldId = createMember();
        memberAuthService.offboard(oldId);

        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"시현\",\"roles\":[\"BACKEND\"],\"cohort\":14,\"studentId\":\"2020123456\",\"phone\":\"01000000000\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.cohort").value(14));
    }

    // ── POST /api/admin/members/bulk ─────────────────────────────────

    @WithMockAdminUser
    @Test
    void createMembersBulk_Admin_Returns201AndCreatesEveryMember() throws Exception {
        mockMvc.perform(post("/api/admin/members/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "members": [
                                    {
                                      "name": "첫째",
                                      "roles": ["BACKEND"],
                                      "cohort": 14,
                                      "studentId": "2099000001",
                                      "phone": "01000000001"
                                    },
                                    {
                                      "name": "둘째",
                                      "roles": ["FRONTEND", "PR_MEMBER"],
                                      "cohort": 14,
                                      "studentId": "2099000002",
                                      "phone": "01000000002"
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.count").value(2))
                .andExpect(jsonPath("$.members.length()").value(2))
                .andExpect(jsonPath("$.members[0].name").value("첫째"))
                .andExpect(jsonPath("$.members[1].name").value("둘째"))
                .andExpect(jsonPath("$.members[0].phone").doesNotExist())
                .andExpect(jsonPath("$.members[1].phone").doesNotExist());

        mockMvc.perform(get("/api/admin/members"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @WithMockAdminUser
    @Test
    void createMembersBulk_DuplicateStudentIdInInput_ReturnsIndexedErrorAndCreatesNobody() throws Exception {
        mockMvc.perform(post("/api/admin/members/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "members": [
                                    {
                                      "name": "첫째",
                                      "roles": ["BACKEND"],
                                      "cohort": 14,
                                      "studentId": "2099000001",
                                      "phone": "01000000001"
                                    },
                                    {
                                      "name": "둘째",
                                      "roles": ["FRONTEND"],
                                      "cohort": 14,
                                      "studentId": "2099000001",
                                      "phone": "01000000002"
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BULK_MEMBER_INVALID"))
                .andExpect(jsonPath("$.index").value(1))
                .andExpect(jsonPath("$.field").value("studentId"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("2번째 멤버")));

        mockMvc.perform(get("/api/admin/members"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @WithMockAdminUser
    @Test
    void createMembersBulk_ExistingStudentIdConflict_Returns409AndCreatesNobody() throws Exception {
        createMember();

        mockMvc.perform(post("/api/admin/members/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "members": [
                                    {
                                      "name": "새 멤버",
                                      "roles": ["FRONTEND"],
                                      "cohort": 14,
                                      "studentId": "2099000001",
                                      "phone": "01000000001"
                                    },
                                    {
                                      "name": "기존 학번",
                                      "roles": ["BACKEND"],
                                      "cohort": 14,
                                      "studentId": "2020123456",
                                      "phone": "01000000002"
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.index").value(1))
                .andExpect(jsonPath("$.field").value("studentId"));

        mockMvc.perform(get("/api/admin/members"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].studentId").value("2020123456"));
    }

    @WithMockAdminUser
    @Test
    void createMembersBulk_BlankRequiredField_ReturnsIndexedError() throws Exception {
        mockMvc.perform(post("/api/admin/members/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "members": [
                                    {
                                      "name": "",
                                      "roles": ["BACKEND"],
                                      "cohort": 14,
                                      "studentId": "2099000001",
                                      "phone": "01000000001"
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.index").value(0))
                .andExpect(jsonPath("$.field").value("name"));
    }

    @WithMockAdminUser
    @Test
    void createMembersBulk_EmptyArray_Returns400() throws Exception {
        mockMvc.perform(post("/api/admin/members/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"members\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("등록할 멤버를 한 명 이상 입력해주세요."));
    }

    @WithMockUser(roles = "MEMBER")
    @Test
    void createMembersBulk_Member_Returns403() throws Exception {
        mockMvc.perform(post("/api/admin/members/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "members": [
                                    {
                                      "name": "멤버",
                                      "roles": ["BACKEND"],
                                      "cohort": 14,
                                      "studentId": "2099000001",
                                      "phone": "01000000001"
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void createMembersBulk_Unauthenticated_Returns401() throws Exception {
        mockMvc.perform(post("/api/admin/members/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "members": [
                                    {
                                      "name": "멤버",
                                      "roles": ["BACKEND"],
                                      "cohort": 14,
                                      "studentId": "2099000001",
                                      "phone": "01000000001"
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isUnauthorized());
    }

    // ── PATCH /api/admin/members/{id} ────────────────────────────────

    @WithMockAdminUser
    @Test
    void updateMember_Admin_Returns200() throws Exception {
        Long id = createMember();

        mockMvc.perform(patch("/api/admin/members/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"시현(수정)\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("시현(수정)"))
                .andExpect(jsonPath("$.cohort").value(13));
    }

    // 위키 "정보구조와 권한" 기준 — 수정도 모든 관리자가 쓸 수 있는 공용 권한이다(#145).
    @WithMockAdminUser(role = "ADMIN")
    @Test
    void updateMember_ByAdmin_Returns200() throws Exception {
        Long id = createMember();

        mockMvc.perform(patch("/api/admin/members/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"수정시도\"}"))
                .andExpect(status().isOk());
    }

    @WithMockUser(roles = "MEMBER")
    @Test
    void updateMember_ByMember_Returns403() throws Exception {
        Long id = createMember();

        mockMvc.perform(patch("/api/admin/members/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"수정시도\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateMember_Unauthenticated_Returns4xx() throws Exception {
        Long id = createMember();

        mockMvc.perform(patch("/api/admin/members/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"수정시도\"}"))
                .andExpect(status().is4xxClientError());
    }

    @WithMockUser(roles = "ADMIN")
    @Test
    void updateMember_EmptyName_Returns400() throws Exception {
        Long id = createMember();

        mockMvc.perform(patch("/api/admin/members/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @WithMockAdminUser
    @Test
    void updateMember_EmptyPhotoUrl_ClearsPhoto() throws Exception {
        Long id = createMember();

        mockMvc.perform(patch("/api/admin/members/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"photoUrl\":\"\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.photoUrl").doesNotExist());
    }

    @WithMockAdminUser
    @Test
    void updateMember_NonExistentId_Returns404() throws Exception {
        mockMvc.perform(patch("/api/admin/members/{id}", 9999L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"없는사람\"}"))
                .andExpect(status().isNotFound());
    }

    // ── POST /api/admin/members/{id}/password/reset ─────────────────────

    @WithMockAdminUser(role = "ADMIN")
    @Test
    void resetPassword_ByAdmin_Returns200() throws Exception {
        Long id = createMember();

        mockMvc.perform(post("/api/admin/members/{id}/password/reset", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @WithMockUser(roles = "MEMBER")
    @Test
    void resetPassword_ByMember_Returns403() throws Exception {
        Long id = createMember();

        mockMvc.perform(post("/api/admin/members/{id}/password/reset", id))
                .andExpect(status().isForbidden());
    }

    @Test
    void resetPassword_Unauthenticated_Returns4xx() throws Exception {
        Long id = createMember();

        mockMvc.perform(post("/api/admin/members/{id}/password/reset", id))
                .andExpect(status().is4xxClientError());
    }

    @WithMockAdminUser
    @Test
    void resetPassword_NonExistentId_Returns404() throws Exception {
        mockMvc.perform(post("/api/admin/members/{id}/password/reset", 9999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    // ── GET /api/admin/members ───────────────────────────────────────

    @WithMockAdminUser(role = "ADMIN")
    @Test
    void adminList_ByAdmin_IncludesStudentId() throws Exception {
        createMember();

        mockMvc.perform(get("/api/admin/members"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].studentId").value("2020123456"))
                .andExpect(jsonPath("$[0].offboarded").value(false));
    }

    @WithMockUser(roles = "MEMBER")
    @Test
    void adminList_ByMember_Returns403() throws Exception {
        mockMvc.perform(get("/api/admin/members"))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminList_Unauthenticated_Returns4xx() throws Exception {
        mockMvc.perform(get("/api/admin/members"))
                .andExpect(status().is4xxClientError());
    }

    // ── POST /api/admin/members/{id}/offboard ────────────────────────

    @WithMockAdminUser(role = "ADMIN")
    @Test
    void offboard_ByAdmin_Returns200AndMarksOffboarded() throws Exception {
        Long id = createMember();

        mockMvc.perform(post("/api/admin/members/{id}/offboard", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/admin/members"))
                .andExpect(jsonPath("$[0].offboarded").value(true));
    }

    @WithMockUser(roles = "MEMBER")
    @Test
    void offboard_ByMember_Returns403() throws Exception {
        Long id = createMember();

        mockMvc.perform(post("/api/admin/members/{id}/offboard", id))
                .andExpect(status().isForbidden());
    }

    @Test
    void offboard_Unauthenticated_Returns4xx() throws Exception {
        Long id = createMember();

        mockMvc.perform(post("/api/admin/members/{id}/offboard", id))
                .andExpect(status().is4xxClientError());
    }

    @WithMockAdminUser
    @Test
    void offboard_NonExistentId_Returns404() throws Exception {
        mockMvc.perform(post("/api/admin/members/{id}/offboard", 9999L))
                .andExpect(status().isNotFound());
    }

    @WithMockAdminUser
    @Test
    void offboardedMember_CannotLogin() throws Exception {
        Long id = createMember();
        memberAuthService.offboard(id);

        mockMvc.perform(post("/api/member/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"2020123456\",\"password\":\"01000000000\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    // 14기 오프보딩 후 15기로 재입부한 뒤 — 새 계정(새 전화번호=초기 비번)으로는 로그인되고,
    // 옛 14기 계정 비번으로는 여전히 막혀야 한다(#155 리뷰 시나리오).
    @WithMockAdminUser
    @Test
    void reEnrolledMember_LogsInWithNewAccount_OldAccountStillBlocked() throws Exception {
        Long oldId = createMember();
        memberAuthService.offboard(oldId);

        MemberCreateRequest reEnroll = new MemberCreateRequest();
        reEnroll.setName("시현");
        reEnroll.setRoles(Set.of(MemberRole.BACKEND));
        reEnroll.setCohort(14);
        reEnroll.setStudentId("2020123456");
        reEnroll.setPhone("01011112222");
        memberService.create(reEnroll, "admin@likelion.org");

        mockMvc.perform(post("/api/member/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"2020123456\",\"password\":\"01011112222\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/member/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"2020123456\",\"password\":\"01000000000\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }
}
