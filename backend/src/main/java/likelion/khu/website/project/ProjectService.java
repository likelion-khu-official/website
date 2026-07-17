package likelion.khu.website.project;

import likelion.khu.website.member.Member;
import likelion.khu.website.member.MemberRepository;
import likelion.khu.website.project.dto.ProjectCreateRequest;
import likelion.khu.website.project.dto.ProjectDetailResponse;
import likelion.khu.website.project.dto.ProjectImageRequest;
import likelion.khu.website.project.dto.ProjectImageResponse;
import likelion.khu.website.project.dto.ProjectParticipantRequest;
import likelion.khu.website.project.dto.ProjectParticipantResponse;
import likelion.khu.website.project.dto.ProjectSummaryResponse;
import likelion.khu.website.project.dto.ProjectUpdateRequest;
import likelion.khu.website.project.exception.DuplicateParticipantException;
import likelion.khu.website.project.exception.EmptyParticipantsException;
import likelion.khu.website.project.exception.InvalidRepresentativeImageException;
import likelion.khu.website.project.exception.NotProjectParticipantException;
import likelion.khu.website.project.exception.ParticipantMemberNotFoundException;
import likelion.khu.website.project.exception.ProjectNotFoundException;
import likelion.khu.website.project.exception.SelfNotIncludedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectImageRepository projectImageRepository;
    private final ProjectParticipantRepository projectParticipantRepository;
    private final MemberRepository memberRepository;

    @Transactional(readOnly = true)
    public List<ProjectSummaryResponse> getPublicList() {
        return projectRepository.findAllByHiddenFalseOrderByCreatedAtDesc().stream()
                .map(project -> ProjectSummaryResponse.from(project, representativeImageUrl(project.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectDetailResponse getPublicDetail(Long id) {
        Project project = projectRepository.findByIdAndHiddenFalse(id)
                .orElseThrow(ProjectNotFoundException::new);
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

        if (request.getImages() != null) {
            requireAtMostOneRepresentative(request.getImages());
            projectImageRepository.deleteAllByProjectId(id);
            saveImages(project, request.getImages());
        }

        if (request.getParticipants() != null) {
            if (request.getParticipants().isEmpty()) {
                throw new EmptyParticipantsException();
            }
            // 참여자 목록을 통째로 교체할 때 요청자 본인을 빼면, 자기가 수정한 프로젝트인데도
            // 다음부턴 requireParticipant()에 걸려 스스로 못 고치는 상태가 된다 — create()와
            // 같은 불변식을 여기서도 지킨다.
            requireSelfAmongParticipants(request.getParticipants(), memberId);
            requireNoDuplicateParticipants(request.getParticipants());
            projectParticipantRepository.deleteAllByProjectId(id);
            saveParticipants(project, request.getParticipants());
        }

        return toDetailResponse(project);
    }

    @Transactional
    public void delete(Long id, Long memberId) {
        findProjectOrThrow(id);
        requireParticipant(id, memberId);
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
                .orElseThrow(ProjectNotFoundException::new);
    }

    // 참여하지 않은 프로젝트는 못 건드린다 — Done의 핵심 불변식.
    private void requireParticipant(Long projectId, Long memberId) {
        if (!projectParticipantRepository.existsByProjectIdAndMemberId(projectId, memberId)) {
            throw new NotProjectParticipantException();
        }
    }

    private void requireSelfAmongParticipants(List<ProjectParticipantRequest> participants, Long creatorMemberId) {
        boolean includesSelf = participants.stream().anyMatch(p -> p.getMemberId().equals(creatorMemberId));
        if (!includesSelf) {
            throw new SelfNotIncludedException();
        }
    }

    // 같은 memberId를 참여자 목록에 두 번 넣으면 ProjectParticipant 행이 중복 저장돼(유니크
    // 제약 없음) 상세 응답에 같은 사람이 두 번 나온다 — 상태공간트리 QA에서 발견.
    private void requireNoDuplicateParticipants(List<ProjectParticipantRequest> participants) {
        long distinctCount = participants.stream().map(ProjectParticipantRequest::getMemberId)
                .collect(Collectors.toSet()).size();
        if (distinctCount != participants.size()) {
            throw new DuplicateParticipantException();
        }
    }

    private void requireAtMostOneRepresentative(List<ProjectImageRequest> images) {
        if (images == null || images.isEmpty()) {
            return;
        }
        long representativeCount = images.stream().filter(ProjectImageRequest::isRepresentative).count();
        if (representativeCount != 1) {
            throw new InvalidRepresentativeImageException();
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
                    .orElseThrow(ParticipantMemberNotFoundException::new);
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
