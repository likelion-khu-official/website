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
    private EmailType type;

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

    private EmailLog(String recipient, EmailType type, String subject, EmailStatus status,
                      String errorMessage, String messageId) {
        this.recipient = recipient;
        this.type = type;
        this.subject = subject;
        this.status = status;
        this.errorMessage = errorMessage;
        this.messageId = messageId;
        this.sentAt = LocalDateTime.now();
    }

    public static EmailLog success(String recipient, EmailType type, String subject, String messageId) {
        return new EmailLog(recipient, type, subject, EmailStatus.SUCCESS, null, messageId);
    }

    public static EmailLog failure(String recipient, EmailType type, String subject,
                                    String errorMessage, String messageId) {
        return new EmailLog(recipient, type, subject, EmailStatus.FAILURE, errorMessage, messageId);
    }
}
