package likelion.khu.website.member;

import likelion.khu.website.audit.AuditChanges;
import likelion.khu.website.audit.AuditOutcome;
import likelion.khu.website.audit.AuditService;
import likelion.khu.website.member.dto.MemberAdminResponse;
import likelion.khu.website.member.dto.MemberCreateRequest;
import likelion.khu.website.member.dto.MemberProfileReplaceRequest;
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
    private final AuditService auditService;

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
        String createDetail = new AuditChanges()
                .value("역할", new java.util.TreeSet<>(member.getRoles()))
                .value("기수", member.getCohort())
                .value("학과", member.getDepartment())
                .toDetailOrNull();
        auditService.recordStateChange("멤버 등록: " + member.getName() + " (" + member.getStudentId() + ")",
                createDetail, "MEMBER", member.getId(), AuditOutcome.SUCCESS);
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
        List<MemberAdminResponse> created = memberRepository.saveAllAndFlush(members).stream()
                .map(MemberAdminResponse::from)
                .toList();
        auditService.recordStateChange("멤버 " + created.size() + "명 일괄 등록", "MEMBER", null, AuditOutcome.SUCCESS);
        return created;
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
        boolean publicationConsent = request.getPublicationConsent() == null
                || Boolean.TRUE.equals(request.getPublicationConsent());
        LocalDateTime consentedAt = resolveCreateConsent(
                request.getPublicationConsent(), request.getPublicationConsentedAt()
        );
        // 초기 비밀번호 = 전화번호(BCrypt 해시). 첫 로그인 때 반드시 바꾸게 되므로 평문 그대로 저장하지 않는다.
        Member member = Member.create(
                request.getName(), request.getRoles(), request.getCohort(),
                emoji, request.getPhotoUrl(), request.getJoinReason(), request.getDepartment(),
                publicationConsent, consentedAt, createdBy,
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
        String beforeName = member.getName();
        String beforeRoles = new java.util.TreeSet<>(member.getRoles()).toString();
        String beforeDept = member.getDepartment();
        String beforeReason = member.getJoinReason();
        String beforePhoto = member.getPhotoUrl();
        boolean beforeConsent = member.isPublicationConsent();
        member.update(
                request.getName(), request.getRoles(), request.getPhotoUrl(), request.getJoinReason(),
                request.getDepartment(), request.getPublicationConsent(), consentedAt, updatedBy
        );
        String updateDetail = new AuditChanges()
                .field("이름", beforeName, member.getName())
                .field("역할", beforeRoles, new java.util.TreeSet<>(member.getRoles()).toString())
                .field("학과", beforeDept, member.getDepartment())
                .masked("입부계기", beforeReason, member.getJoinReason())
                .masked("대표 사진", beforePhoto, member.getPhotoUrl())
                .field("게재동의", beforeConsent ? "동의" : "미동의", member.isPublicationConsent() ? "동의" : "미동의")
                .toDetailOrNull();
        auditService.recordStateChange("멤버 수정: " + member.getName(), updateDetail, "MEMBER", id, AuditOutcome.SUCCESS);
        return MemberAdminResponse.from(member);
    }

    // 로그인한 본인의 프로필 조회(#285) — publicationConsent와 무관하게 항상 자기 자신은 볼 수 있어야 해서
    // getAll()의 공개 목록 쿼리를 안 쓰고 id로 바로 찾는다.
    @Transactional(readOnly = true)
    public MemberResponse getSelf(Long memberId) {
        return MemberResponse.from(findActiveMember(memberId));
    }

    // 본인 프로필 셀프 편집(#285) — 사진·입부계기만 바뀐다. 요청 DTO에 이름·역할·기수·이모지 필드가
    // 아예 없어서 본문을 조작해도 그 필드들은 못 건드린다. admin update()와 달리 관리자 행위가 아니라
    // 감사 로그(auditService) 대상이 아니다 — PostService/ProjectService의 본인 콘텐츠 수정도 마찬가지.
    @Transactional
    public MemberResponse updateSelfProfile(Long memberId, MemberProfileReplaceRequest request) {
        Member member = findActiveMember(memberId);
        member.updateProfile(request.getPhotoUrl(), request.getJoinReason(), "member:" + member.getStudentId());
        return MemberResponse.from(member);
    }

    // 오프보딩된 계정은 로그인 자체가 막히지만(MemberAuthService), 혹시 남아있는 refresh 토큰 등으로
    // 여기까지 요청이 왔을 때 본인 프로필을 계속 고칠 수 있으면 안 되므로 한 번 더 막는다.
    private Member findActiveMember(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "멤버를 찾을 수 없어요."));
        if (member.isOffboarded()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "멤버를 찾을 수 없어요.");
        }
        return member;
    }

    private LocalDateTime resolveCreateConsent(Boolean consent, LocalDateTime consentedAt) {
        if (consent == null) {
            if (consentedAt != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "게재 동의 여부와 동의 시각을 함께 입력해주세요.");
            }
            return LocalDateTime.now();
        }
        return validateConsent(consent, consentedAt);
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
