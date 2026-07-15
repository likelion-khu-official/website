package likelion.khu.website.member.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import likelion.khu.website.member.MemberRole;
import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Getter
@Setter
public class MemberCreateRequest {

    @NotBlank
    private String name;

    @NotEmpty
    private Set<MemberRole> roles;

    @NotNull
    private Integer cohort;

    private String photoUrl;

    private String joinReason;

    // 로그인 아이디(학번). 초기 비밀번호는 phone을 그대로 써서 서버가 해시한다 — 부원이 따로 낼 게 없다.
    @NotBlank
    private String studentId;

    @NotBlank
    private String phone;
}
