package likelion.khu.website.email;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * #74(어드민 초대)가 붙었을 때 생길 법한 호출 형태 — {@code @Transactional} 메서드 안에서
 * EmailService를 호출하는 것 — 를 흉내 내는 테스트 전용 협력자.
 * EmailService.send()의 트랜잭션 가드(활성 트랜잭션 안에서 호출 시 즉시 실패)가 실제 Spring
 * 트랜잭션 프록시 환경에서도 작동하는지 검증하는 데 씀(왜 필요한지는 EmailService.send() 주석
 * 및 #85 리뷰 — 신선우 참고).
 */
@Component
@RequiredArgsConstructor
class TransactionalEmailInviter {

    private final EmailService emailService;

    @Transactional
    void inviteInsideTransaction(String to, String inviteUrl, LocalDateTime expiresAt) {
        emailService.sendInviteEmail(to, inviteUrl, expiresAt);
    }
}
