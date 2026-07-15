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
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트를 찾을 수 없어요."));
        return toDetailResponse(project);
    }

    @Transactional
    public ProjectDetailResponse create(ProjectCreateRequest request, Long creatorMemberId) {
        requireSelfAmongParticipants(request.getParticipants(), creatorMemberId);
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
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "참여 멤버는 최소 1명 있어야 해요.");
            }
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
