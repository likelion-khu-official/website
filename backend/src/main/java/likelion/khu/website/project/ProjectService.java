package likelion.khu.website.project;

import likelion.khu.website.member.Member;
import likelion.khu.website.member.MemberRepository;
import likelion.khu.website.storage.OciStorageService;
import likelion.khu.website.project.dto.ProjectCreateRequest;
import likelion.khu.website.project.dto.ProjectDetailResponse;
import likelion.khu.website.project.dto.ProjectImageRequest;
import likelion.khu.website.project.dto.ProjectImageResponse;
import likelion.khu.website.project.dto.ProjectParticipantRequest;
import likelion.khu.website.project.dto.ProjectParticipantResponse;
import likelion.khu.website.project.dto.ProjectSummaryResponse;
import likelion.khu.website.project.dto.ProjectUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectImageRepository projectImageRepository;
    private final ProjectParticipantRepository projectParticipantRepository;
    private final MemberRepository memberRepository;
    private final OciStorageService storageService;

    @Transactional(readOnly = true)
    public List<ProjectSummaryResponse> getPublicList() {
        return projectRepository.findAllByHiddenFalseOrderByCreatedAtDesc().stream()
                .map(project -> ProjectSummaryResponse.from(project, representativeImageUrl(project.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectDetailResponse getPublicDetail(Long id) {
        Project project = projectRepository.findByIdAndHiddenFalse(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트를 찾을 수 없어요."));
        return toDetailResponse(project);
    }

    @Transactional
    public ProjectDetailResponse create(ProjectCreateRequest request, Long creatorMemberId) {
        requireSelfAmongParticipants(request.getParticipants(), creatorMemberId);
        requireNoDuplicateParticipants(request.getParticipants());
        requireAtMostOneRepresentative(request.getImages());

        Project project = Project.create(
                request.getTitle(), request.getSummary(), request.getCohort(), request.getTechStack(),
                request.getGithubUrl(), request.getStartDate(), request.getEndDate());
        projectRepository.save(project);

        saveImages(project, request.getImages());
        saveParticipants(project, request.getParticipants());

        return toDetailResponse(project);
    }

    @Transactional
    public ProjectDetailResponse update(Long id, ProjectUpdateRequest request, Long memberId) {
        Project project = findProjectOrThrow(id);
        requireParticipant(id, memberId);

        project.update(request.getTitle(), request.getSummary(), request.getTechStack(),
                request.getGithubUrl(), request.getStartDate(), request.getEndDate());

        return toDetailResponse(project);
    }

    // 새 이미지를 대표(representative=true)로 추가하면 기존 대표는 자동으로 해제한다 —
    // "대표는 항상 최대 1장"을 유지하되, 프론트가 "먼저 기존 대표 해제 → 새로 추가" 2단계를
    // 안 밟아도 되게 한다.
    @Transactional
    public ProjectDetailResponse addImage(Long projectId, Long memberId, ProjectImageRequest request) {
        Project project = findProjectOrThrow(projectId);
        requireParticipant(projectId, memberId);

        if (request.isRepresentative()) {
            projectImageRepository.findAllByProjectIdOrderByIdAsc(projectId)
                    .forEach(image -> image.setRepresentative(false));
        }
        projectImageRepository.save(ProjectImage.create(project, request.getUrl(), request.isRepresentative()));

        return toDetailResponse(project);
    }

    // 대표 이미지를 지워도 막지 않는다 — 대표 없음(0장) 상태를 허용, 자동 승격도 안 한다.
    // 다음 대표는 멤버가 addImage(representative=true)로 명시적으로 다시 지정한다.
    @Transactional
    public ProjectDetailResponse removeImage(Long projectId, Long memberId, Long imageId) {
        Project project = findProjectOrThrow(projectId);
        requireParticipant(projectId, memberId);

        ProjectImage image = projectImageRepository.findByIdAndProjectId(imageId, projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "이미지를 찾을 수 없어요."));
        projectImageRepository.delete(image);
        storageService.deleteByUrl(image.getUrl());

        return toDetailResponse(project);
    }

    @Transactional
    public ProjectDetailResponse addParticipant(Long projectId, Long memberId, ProjectParticipantRequest request) {
        Project project = findProjectOrThrow(projectId);
        requireParticipant(projectId, memberId);

        if (projectParticipantRepository.existsByProjectIdAndMemberId(projectId, request.getMemberId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 참여 중인 멤버예요.");
        }
        Member newParticipant = memberRepository.findById(request.getMemberId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "멤버를 찾을 수 없어요."));
        projectParticipantRepository.save(ProjectParticipant.create(project, newParticipant, request.getPart()));

        return toDetailResponse(project);
    }

    // 참여자면 누구든(본인 포함) 다른 참여자를 뺄 수 있다 — update()의 기존 철학과 동일한
    // 느슨한 공동편집 모델. 다만 최소 1명은 항상 남아야 한다(create()의 참여자 필수 불변식과 동일).
    @Transactional
    public ProjectDetailResponse removeParticipant(Long projectId, Long memberId, Long participantId) {
        Project project = findProjectOrThrow(projectId);
        requireParticipant(projectId, memberId);

        ProjectParticipant participant = projectParticipantRepository.findByIdAndProjectId(participantId, projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "참여자를 찾을 수 없어요."));
        if (projectParticipantRepository.countByProjectId(projectId) <= 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "참여 멤버는 최소 1명 있어야 해요.");
        }
        projectParticipantRepository.delete(participant);

        return toDetailResponse(project);
    }

    @Transactional
    public void delete(Long id, Long memberId) {
        findProjectOrThrow(id);
        requireParticipant(id, memberId);
        projectImageRepository.findAllByProjectIdOrderByIdAsc(id)
                .forEach(image -> storageService.deleteByUrl(image.getUrl()));
        projectImageRepository.deleteAllByProjectId(id);
        projectParticipantRepository.deleteAllByProjectId(id);
        projectRepository.deleteById(id);
    }

    @Transactional
    public void setHidden(Long id, boolean hidden) {
        Project project = findProjectOrThrow(id);
        project.setHidden(hidden);
    }

    private Project findProjectOrThrow(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트를 찾을 수 없어요."));
    }

    // 참여하지 않은 프로젝트는 못 건드린다 — Done의 핵심 불변식.
    private void requireParticipant(Long projectId, Long memberId) {
        if (!projectParticipantRepository.existsByProjectIdAndMemberId(projectId, memberId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "참여한 프로젝트만 수정·삭제할 수 있어요.");
        }
    }

    private void requireSelfAmongParticipants(List<ProjectParticipantRequest> participants, Long creatorMemberId) {
        boolean includesSelf = participants.stream().anyMatch(p -> p.getMemberId().equals(creatorMemberId));
        if (!includesSelf) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "본인을 참여 멤버에 포함해주세요.");
        }
    }

    // 같은 memberId를 참여자 목록에 두 번 넣으면 ProjectParticipant 행이 중복 저장돼(유니크
    // 제약 없음) 상세 응답에 같은 사람이 두 번 나온다 — 상태공간트리 QA에서 발견.
    private void requireNoDuplicateParticipants(List<ProjectParticipantRequest> participants) {
        long distinctCount = participants.stream().map(ProjectParticipantRequest::getMemberId)
                .collect(Collectors.toSet()).size();
        if (distinctCount != participants.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "참여 멤버가 중복돼 있어요.");
        }
    }

    private void requireAtMostOneRepresentative(List<ProjectImageRequest> images) {
        if (images == null || images.isEmpty()) {
            return;
        }
        long representativeCount = images.stream().filter(ProjectImageRequest::isRepresentative).count();
        if (representativeCount != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "대표 이미지를 정확히 1장 지정해주세요.");
        }
    }

    private void saveImages(Project project, List<ProjectImageRequest> images) {
        if (images == null) {
            return;
        }
        images.forEach(req -> projectImageRepository.save(
                ProjectImage.create(project, req.getUrl(), req.isRepresentative())));
    }

    private void saveParticipants(Project project, List<ProjectParticipantRequest> participants) {
        participants.forEach(req -> {
            Member member = memberRepository.findById(req.getMemberId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "멤버를 찾을 수 없어요."));
            projectParticipantRepository.save(ProjectParticipant.create(project, member, req.getPart()));
        });
    }

    private String representativeImageUrl(Long projectId) {
        return projectImageRepository.findAllByProjectIdOrderByIdAsc(projectId).stream()
                .filter(ProjectImage::isRepresentative)
                .map(ProjectImage::getUrl)
                .findFirst()
                .orElse(null);
    }

    private ProjectDetailResponse toDetailResponse(Project project) {
        List<ProjectImageResponse> images = projectImageRepository.findAllByProjectIdOrderByIdAsc(project.getId())
                .stream().map(ProjectImageResponse::from).toList();
        List<ProjectParticipantResponse> participants = projectParticipantRepository
                .findAllByProjectIdWithMember(project.getId())
                .stream().map(ProjectParticipantResponse::from).toList();
        return ProjectDetailResponse.from(project, images, participants);
    }
}
