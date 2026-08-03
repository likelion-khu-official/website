package likelion.khu.website.audit;

import java.util.Objects;

// 변경 전→후를 사람이 읽는 한 줄들로 모은다(감사 이벤트의 detail = 커밋 로그 본문 격).
// 값이 안 바뀐 필드는 건너뛰고, 하나도 안 바뀌었으면 detail은 null이 된다(요약만 남는다).
//
// 민감정보(전화·학번 등)는 masked()로 담는다 — 값 없이 "…변경됨"만 남겨, 로그 자체가 개인정보
// 사본이 되지 않게 한다(SECURITY.md: 감사 이벤트에 개인정보 '내용'을 담지 않는다).
public class AuditChanges {

    private final StringBuilder sb = new StringBuilder();

    // 전→후 값을 그대로 보여주는 일반 필드(이름·역할·직책 등 비민감).
    public AuditChanges field(String label, Object before, Object after) {
        if (changed(before, after)) {
            line(label + ": " + display(before) + " → " + display(after));
        }
        return this;
    }

    // 민감 필드 — 바뀐 사실만 남기고 값은 남기지 않는다.
    public AuditChanges masked(String label, Object before, Object after) {
        if (changed(before, after)) {
            line(label + " 변경됨");
        }
        return this;
    }

    // 생성·삭제처럼 전/후가 아니라 "이런 내용"을 나열할 때(비민감 값만).
    public AuditChanges value(String label, Object value) {
        if (value != null && !display(value).isBlank()) {
            line(label + ": " + display(value));
        }
        return this;
    }

    public boolean isEmpty() {
        return sb.length() == 0;
    }

    // 아무 것도 안 바뀌었으면 null — detail 없이 요약만 남게.
    public String toDetailOrNull() {
        return isEmpty() ? null : sb.toString();
    }

    private boolean changed(Object before, Object after) {
        return !Objects.equals(display(before), display(after));
    }

    private void line(String text) {
        if (sb.length() > 0) {
            sb.append('\n');
        }
        sb.append(text);
    }

    private String display(Object value) {
        if (value == null) {
            return "(없음)";
        }
        String text = String.valueOf(value);
        return text.isBlank() ? "(없음)" : text;
    }
}
