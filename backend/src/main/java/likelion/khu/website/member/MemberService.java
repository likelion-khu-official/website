package likelion.khu.website.member;

import likelion.khu.website.member.dto.MemberAdminResponse;
import likelion.khu.website.member.dto.MemberCreateRequest;
import likelion.khu.website.member.dto.MemberResponse;
import likelion.khu.website.member.dto.MemberUpdateRequest;
import likelion.khu.website.member.exception.MemberBulkCreateException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
        return memberRepository.findAllByPublicationConsentTrueAndOffboardedAtIsNullOrderByCreatedAtAsc().stream()
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
        validateAvailability(request);
        Member member = buildMember(request, createdBy);
        memberRepository.save(member);
        return MemberAdminResponse.from(member);
    }

    @Transactional
    public List<MemberAdminResponse> createBulk(List<MemberCreateRequest> requests, String createdBy) {
        Map<String, Integer> studentIdIndexes = new HashMap<>();

        for (int index = 0; index < requests.size(); index++) {
            MemberCreateRequest request = requests.get(index);
            validateBulkRequest(request, index);

            Integer previousIndex = studentIdIndexes.putIfAbsent(request.getStudentId(), index);
            if (previousIndex != null) {
                throw new MemberBulkCreateException(
                        HttpStatus.BAD_REQUEST,
                        index,
                        "studentId",
                        (previousIndex + 1) + "번째 멤버와 학번이 중복돼요."
                );
            }

            validateBulkAvailability(request, index);
        }

        List<Member> members = requests.stream()
                .map(request -> buildMember(request, createdBy))
                .toList();
        return memberRepository.saveAllAndFlush(members).stream()
                .map(MemberAdminResponse::from)
                .toList();
    }

    private void validateAvailability(MemberCreateRequest request) {
        // 한 사람이 동시에 두 기수로 활동 중일 순 없다 — 기수가 달라도 활동 중인 계정이 이미
        // 있으면 막는다(재등록하려면 먼저 오프보딩부터).
        if (memberRepository.existsByStudentIdAndOffboardedAtIsNull(request.getStudentId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 활동 중인 학번이에요. 먼저 오프보딩해주세요.");
        }
        // 오프보딩된 뒤 같은 기수로 다시 등록하려는 경우까지 막는다(학번+기수 조합 자체의 중복).
        if (memberRepository.existsByStudentIdAndCohort(request.getStudentId(), request.getCohort())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 등록된 학번이에요.");
        }
    }

    private void validateBulkAvailability(MemberCreateRequest request, int index) {
        if (memberRepository.existsByStudentIdAndOffboardedAtIsNull(request.getStudentId())) {
            throw new MemberBulkCreateException(
                    HttpStatus.CONFLICT, index, "studentId", "이미 활동 중인 학번이에요. 먼저 오프보딩해주세요."
            );
        }
        if (memberRepository.existsByStudentIdAndCohort(request.getStudentId(), request.getCohort())) {
            throw new MemberBulkCreateException(
                    HttpStatus.CONFLICT, index, "studentId", "같은 기수에 이미 등록된 학번이에요."
            );
        }
    }

    private void validateBulkRequest(MemberCreateRequest request, int index) {
        if (request == null) {
            throw new MemberBulkCreateException(HttpStatus.BAD_REQUEST, index, "member", "객체 형식으로 입력해주세요.");
        }
        if (request.getName() == null || request.getName().isBlank()) {
            throw new MemberBulkCreateException(HttpStatus.BAD_REQUEST, index, "name", "이름을 입력해주세요.");
        }
        if (request.getStudentId() == null || request.getStudentId().isBlank()) {
            throw new MemberBulkCreateException(HttpStatus.BAD_REQUEST, index, "studentId", "학번을 문자열로 입력해주세요.");
        }
        if (request.getPhone() == null || request.getPhone().isBlank()) {
            throw new MemberBulkCreateException(HttpStatus.BAD_REQUEST, index, "phone", "전화번호를 문자열로 입력해주세요.");
        }
        if (request.getCohort() == null || request.getCohort() <= 0) {
            throw new MemberBulkCreateException(HttpStatus.BAD_REQUEST, index, "cohort", "기수를 1 이상의 정수로 입력해주세요.");
        }
        if (request.getRoles() == null || request.getRoles().isEmpty()) {
            throw new MemberBulkCreateException(HttpStatus.BAD_REQUEST, index, "roles", "역할을 한 개 이상 입력해주세요.");
        }
        try {
            validateConsent(request.getPublicationConsent(), request.getPublicationConsentedAt());
        } catch (ResponseStatusException exception) {
            throw new MemberBulkCreateException(
                    HttpStatus.BAD_REQUEST, index, "publicationConsent", exception.getReason()
            );
        }
    }

    private Member buildMember(MemberCreateRequest request, String createdBy) {
        String emoji = EMOJI_POOL.get(RANDOM.nextInt(EMOJI_POOL.size()));
        LocalDateTime consentedAt = validateConsent(
                request.getPublicationConsent(), request.getPublicationConsentedAt()
        );
        // 초기 비밀번호 = 전화번호(BCrypt 해시). 첫 로그인 때 반드시 바꾸게 되므로 평문 그대로 저장하지 않는다.
        Member member = Member.create(
                request.getName(), request.getRoles(), request.getCohort(),
                emoji, request.getPhotoUrl(), request.getJoinReason(), request.getDepartment(),
                Boolean.TRUE.equals(request.getPublicationConsent()), consentedAt, createdBy,
                request.getStudentId(), request.getPhone(), passwordEncoder.encode(request.getPhone())
        );
        return member;
    }

    @Transactional
    public MemberAdminResponse update(Long id, MemberUpdateRequest request, String updatedBy) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "멤버를 찾을 수 없어요."));
        if (request.getPublicationConsent() == null && request.getPublicationConsentedAt() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "게재 동의 여부와 동의 시각을 함께 입력해주세요.");
        }
        LocalDateTime consentedAt = request.getPublicationConsent() == null
                ? null
                : validateConsent(request.getPublicationConsent(), request.getPublicationConsentedAt());
        member.update(
                request.getName(), request.getRoles(), request.getPhotoUrl(), request.getJoinReason(),
                request.getDepartment(), request.getPublicationConsent(), consentedAt, updatedBy
        );
        return MemberAdminResponse.from(member);
    }

    private LocalDateTime validateConsent(Boolean consent, LocalDateTime consentedAt) {
        if (Boolean.TRUE.equals(consent) && consentedAt == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "게재 동의 시각을 입력해주세요.");
        }
        if (!Boolean.TRUE.equals(consent) && consentedAt != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "게재 미동의 상태에는 동의 시각을 입력할 수 없어요.");
        }
        return Boolean.TRUE.equals(consent) ? consentedAt : null;
    }
}
