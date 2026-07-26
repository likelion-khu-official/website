package likelion.khu.website.member;

import likelion.khu.website.member.dto.MemberAdminResponse;
import likelion.khu.website.member.dto.MemberCreateRequest;
import likelion.khu.website.member.dto.MemberResponse;
import likelion.khu.website.member.dto.MemberUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class MemberService {

    // 디자인 협의 결과로 값만 바꾸면 되게 한 곳에 모아둠
    static final List<String> EMOJI_POOL = List.of(
            "🦁", "🐯", "🐻", "🦊", "🐼", "🐨", "🐸", "🦋",
            "🌟", "⭐", "🌙", "☀️", "🌈", "🔥", "💫", "✨",
            "🐳", "🐬", "🦈", "🐙", "🦑", "🦀", "🐠", "🦜",
            "🦩", "🦚", "🦉", "🦅", "🐺", "🦝", "🦔", "🐿️",
            "🦭", "🐘", "🦒", "🦓", "🦛", "🐆", "🦘", "🦙",
            "🦦", "🦥", "🐇", "🐧", "🦆", "🦢", "🐝", "🐞",
            "🐌", "🐛", "🦗", "🪲", "🦎", "🐊", "🦕", "🦖",
            "🌕", "⚡", "🌊", "🍀", "🌺", "🌸", "🌼", "🌻",
            "🍁", "🌿", "🌴", "🌵", "💎", "🔮", "🌠", "🪄",
            "🎭", "🎪", "🎠", "🎡", "🪀", "🎯", "🧿", "🫧"
    );

    private static final Random RANDOM = new Random();

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<MemberResponse> getAll() {
        return memberRepository.findAllByOrderByCreatedAtAsc().stream()
                .map(MemberResponse::from)
                .toList();
    }

    // 관리자 전용 목록 — studentId·오프보딩 상태 포함(#145).
    @Transactional(readOnly = true)
    public List<MemberAdminResponse> getAllForAdmin() {
        return memberRepository.findAllByOrderByCreatedAtAsc().stream()
                .map(MemberAdminResponse::from)
                .toList();
    }

    @Transactional
    public MemberAdminResponse create(MemberCreateRequest request, String createdBy) {
        // 한 사람이 동시에 두 기수로 활동 중일 순 없다 — 기수가 달라도 활동 중인 계정이 이미
        // 있으면 막는다(재등록하려면 먼저 오프보딩부터).
        if (memberRepository.existsByStudentIdAndOffboardedAtIsNull(request.getStudentId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 활동 중인 학번이에요. 먼저 오프보딩해주세요.");
        }
        // 오프보딩된 뒤 같은 기수로 다시 등록하려는 경우까지 막는다(학번+기수 조합 자체의 중복).
        if (memberRepository.existsByStudentIdAndCohort(request.getStudentId(), request.getCohort())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 등록된 학번이에요.");
        }
        String emoji = EMOJI_POOL.get(RANDOM.nextInt(EMOJI_POOL.size()));
        // 초기 비밀번호 = 전화번호(BCrypt 해시). 첫 로그인 때 반드시 바꾸게 되므로 평문 그대로 저장하지 않는다.
        Member member = Member.create(
                request.getName(), request.getRoles(), request.getCohort(),
                emoji, request.getPhotoUrl(), request.getJoinReason(), createdBy,
                request.getStudentId(), request.getPhone(), passwordEncoder.encode(request.getPhone())
        );
        memberRepository.save(member);
        return MemberAdminResponse.from(member);
    }

    @Transactional
    public MemberAdminResponse update(Long id, MemberUpdateRequest request, String updatedBy) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "멤버를 찾을 수 없어요."));
        member.update(request.getName(), request.getRoles(), request.getPhotoUrl(), request.getJoinReason(), updatedBy);
        return MemberAdminResponse.from(member);
    }
}
