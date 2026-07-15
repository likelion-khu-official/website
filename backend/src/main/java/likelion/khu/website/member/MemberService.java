package likelion.khu.website.member;

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

    @Transactional
    public MemberResponse create(MemberCreateRequest request, String createdBy) {
        if (memberRepository.existsByStudentId(request.getStudentId())) {
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
        return MemberResponse.from(member);
    }

    @Transactional
    public MemberResponse update(Long id, MemberUpdateRequest request, String updatedBy) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "멤버를 찾을 수 없어요."));
        member.update(request.getName(), request.getRoles(), request.getPhotoUrl(), request.getJoinReason(), updatedBy);
        return MemberResponse.from(member);
    }
}
