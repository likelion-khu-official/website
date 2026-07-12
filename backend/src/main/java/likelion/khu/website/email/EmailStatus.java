package likelion.khu.website.email;

// String 대신 enum으로 제한해 오타("Success" 등)를 컴파일 타임에 차단.
// EmailLog에서 @Enumerated(EnumType.STRING)으로 저장 — DB엔 이름 그대로("SUCCESS"/"FAILURE") 남음.
public enum EmailStatus {
    SUCCESS,
    FAILURE
}
