package likelion.khu.website.email;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "email_log")
@Getter
@NoArgsConstructor
public class EmailLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String recipient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EmailType emailType;

    @Column(nullable = false)
    private String subject;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EmailStatus status;

    @Column(length = 1000)
    private String errorMessage;

    // SMTP Message-ID — 실제 전송(Transport 연결) 직전 saveChanges()에서 생성됨.
    // 주소·제목 세팅 단계에서 실패하면 그 단계까지 못 가서 null로 남음(= SMTP 시도 자체를 못 했다는 신호).
    // 나중에 OCI Logging(OutboundAccepted/OutboundRelayed)과 조인할 유일한 키라 unique 인덱스만 걸고 PK로는 안 씀.
    @Column(unique = true)
    private String messageId;

    @Column(nullable = false)
    private LocalDateTime sentAt;

    // private — 외부에서 new EmailLog(...)로 임의 생성 못 하게 막고, 아래 success()/failure()로만 생성 강제.
    // 그래서 "성공인데 errorMessage가 들어있는" 같은 불일치 상태가 애초에 만들어질 수 없음.
    private EmailLog(String recipient, EmailType emailType, String subject, EmailStatus status,
                      String errorMessage, String messageId) {
        this.recipient = recipient;
        this.emailType = emailType;
        this.subject = subject;
        this.status = status;
        this.errorMessage = errorMessage;
        this.messageId = messageId;
        this.sentAt = LocalDateTime.now();
    }

    // success/failure 두 팩토리로 나눠서, 성공 로그엔 애초에 errorMessage를 넘길 파라미터 자리 자체가 없게 함
    // (하나의 of(...)로 합쳤다면 status=SUCCESS인데 errorMessage를 실수로 채워 넘기는 걸 막을 방법이 없었을 것).
    public static EmailLog success(String recipient, EmailType emailType, String subject, String messageId) {
        return new EmailLog(recipient, emailType, subject, EmailStatus.SUCCESS, null, messageId);
    }

    public static EmailLog failure(String recipient, EmailType emailType, String subject,
                                    String errorMessage, String messageId) {
        return new EmailLog(recipient, emailType, subject, EmailStatus.FAILURE, errorMessage, messageId);
    }
}
