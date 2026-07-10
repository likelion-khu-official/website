package likelion.khu.website.admin;

import likelion.khu.website.admin.exception.WeakPasswordException;

import java.util.regex.Pattern;

// invite-accept·password-reset 양쪽에서 동일한 규칙을 쓰기 위한 공용 검증 유틸 — 엔티티도 서비스도 아닌
// 순수 stateless 함수라 별도 클래스로 뺐다.
public final class AdminPasswordPolicy {

    private static final int MIN_LENGTH = 8;
    private static final Pattern LETTER = Pattern.compile("[a-zA-Z]");
    private static final Pattern DIGIT = Pattern.compile("[0-9]");

    private AdminPasswordPolicy() {
    }

    public static void validate(String password) {
        if (password == null
                || password.length() < MIN_LENGTH
                || !LETTER.matcher(password).find()
                || !DIGIT.matcher(password).find()) {
            throw new WeakPasswordException();
        }
    }
}
