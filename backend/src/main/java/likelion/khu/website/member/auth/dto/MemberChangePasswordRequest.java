package likelion.khu.website.member.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MemberChangePasswordRequest {

    // 첫 로그인 강제 변경 화면에서도 FE가 사용자에게 다시 묻지 않고 로그인 때 쓴 값(초기값=전화번호)을
    // 그대로 채워 보내면 된다 — 사용자 눈엔 새 비밀번호 입력창만 보이지만, 계정 탈취 방지를 위해
    // 서버는 항상 현재 비밀번호 검증을 요구한다.
    @NotBlank(message = "현재 비밀번호를 입력해주세요.")
    private String currentPassword;

    @NotBlank(message = "새 비밀번호를 입력해주세요.")
    private String newPassword;
}
