package likelion.khu.website.member.auth;

import likelion.khu.website.admin.auth.JwtProvider;
import likelion.khu.website.admin.exception.AccountLockedException;
import likelion.khu.website.admin.exception.InvalidCredentialsException;
import likelion.khu.website.member.Member;
import likelion.khu.website.member.MemberRepository;
import likelion.khu.website.member.MemberRole;
import likelion.khu.website.member.exception.MemberNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

// 스프링 컨테이너 없는 순수 단위 테스트(RecruitmentManagementServiceTest·EmailServiceTest와 동일한
// 스타일). MemberControllerTest·MemberAuthControllerTest가 이미 HTTP 레벨로 오프보딩·로그인 상호작용을
// 검증하지만, DB·Spring 컨텍스트 없이 "오프보딩이면 비번 비교 전에 차단된다" 같은 순서 자체를 빠르게
// 고정하는 테스트가 없었다(#145 리뷰에서 발견한 빈틈) — 여기서 그 자리를 메운다.
class MemberAuthServiceTest {

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private MemberRefreshTokenRepository memberRefreshTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtProvider jwtProvider;

    private MemberAuthService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new MemberAuthService(memberRepository, memberRefreshTokenRepository, passwordEncoder, jwtProvider);
        ReflectionTestUtils.setField(service, "maxAttempts", 5);
        ReflectionTestUtils.setField(service, "lockoutDurationMinutes", 15L);
    }

    // Member.id는 @GeneratedValue라 Member.create()만으론 null — findById(1L) 스텁과 실제
    // service가 member.getId()로 되찾는 id가 어긋나지 않도록(예: revokeAllTokensFor(null) 호출로
    // 새는 버그) 테스트에서 직접 채워준다.
    private Member sampleMember() {
        Member member = Member.create(
                "시현", Set.of(MemberRole.BE), 13, "🦁", null, null, "admin@likelion.org",
                "2020000001", "01000000001", "hashed-phone");
        ReflectionTestUtils.setField(member, "id", 1L);
        return member;
    }

    // 오프보딩된 계정은 비밀번호가 맞아도 틀려도 상관없이 막혀야 한다 — passwordEncoder까지
    // 가지도 않고 그 앞에서 걸러지는지(계정 존재 여부 비노출 순서)를 직접 확인한다.
    @Test
    void login_OffboardedMember_ThrowsBeforeCheckingPassword() {
        Member member = sampleMember();
        member.offboard();
        when(memberRepository.findByStudentId("2020000001")).thenReturn(Optional.of(member));

        assertThatThrownBy(() -> service.login("2020000001", "01000000001"))
                .isInstanceOf(InvalidCredentialsException.class);

        verifyNoInteractions(passwordEncoder);
    }

    @Test
    void login_LockedMember_ThrowsAccountLockedEvenWithCorrectPassword() {
        Member member = sampleMember();
        member.recordFailedLogin(1, Duration.ofMinutes(15)); // maxAttempts=1 → 즉시 잠금
        when(memberRepository.findByStudentId("2020000001")).thenReturn(Optional.of(member));

        assertThatThrownBy(() -> service.login("2020000001", "01000000001"))
                .isInstanceOf(AccountLockedException.class);

        verifyNoInteractions(passwordEncoder);
    }

    @Test
    void login_WrongPassword_RecordsFailedAttemptAndThrows() {
        Member member = sampleMember();
        when(memberRepository.findByStudentId("2020000001")).thenReturn(Optional.of(member));
        when(passwordEncoder.matches("wrong", "hashed-phone")).thenReturn(false);

        assertThatThrownBy(() -> service.login("2020000001", "wrong"))
                .isInstanceOf(InvalidCredentialsException.class);

        assertThat(member.getFailedLoginAttempts()).isEqualTo(1);
    }

    @Test
    void login_NonExistentStudentId_ThrowsSameErrorAsWrongPassword() {
        when(memberRepository.findByStudentId("nope")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.login("nope", "anything"))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("학번 또는 비밀번호가 올바르지 않아요.");
    }

    @Test
    void offboard_MarksMemberOffboardedAndRevokesAllActiveTokens() {
        Member member = sampleMember();
        MemberRefreshToken token1 = MemberRefreshToken.issue(1L, "hash1", LocalDateTime.now().plusDays(1));
        MemberRefreshToken token2 = MemberRefreshToken.issue(1L, "hash2", LocalDateTime.now().plusDays(1));
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(memberRefreshTokenRepository.findAllByMemberIdAndRevokedFalse(1L)).thenReturn(List.of(token1, token2));

        service.offboard(1L);

        assertThat(member.isOffboarded()).isTrue();
        assertThat(token1.isValid()).isFalse();
        assertThat(token2.isValid()).isFalse();
    }

    @Test
    void offboard_NonExistentMember_ThrowsMemberNotFoundException() {
        when(memberRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.offboard(999L))
                .isInstanceOf(MemberNotFoundException.class);

        verifyNoInteractions(memberRefreshTokenRepository);
    }

    @Test
    void resetPasswordByAdmin_RevertsToPhoneHashAndForcesChangeAgain() {
        Member member = sampleMember();
        member.changePassword("changed-hash"); // 본인이 한 번 바꾼 상태를 흉내
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(passwordEncoder.encode(member.getPhone())).thenReturn("re-hashed-phone");
        when(memberRefreshTokenRepository.findAllByMemberIdAndRevokedFalse(1L)).thenReturn(List.of());

        service.resetPasswordByAdmin(1L);

        assertThat(member.getPasswordHash()).isEqualTo("re-hashed-phone");
        assertThat(member.isMustChangePassword()).isTrue();
    }

    @Test
    void changePassword_WrongCurrentPassword_ThrowsAndDoesNotRevokeTokens() {
        Member member = sampleMember();
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(passwordEncoder.matches("wrong", "hashed-phone")).thenReturn(false);

        assertThatThrownBy(() -> service.changePassword(1L, "wrong", "newPassword1"))
                .isInstanceOf(InvalidCredentialsException.class);

        verify(memberRefreshTokenRepository, never()).findAllByMemberIdAndRevokedFalse(any());
    }
}
