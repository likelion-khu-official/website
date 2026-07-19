package likelion.khu.website.staff;

import likelion.khu.website.staff.dto.StaffCreateRequest;
import likelion.khu.website.staff.dto.StaffResponse;
import likelion.khu.website.staff.dto.StaffUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StaffService {

    private final StaffRepository staffRepository;

    @Transactional(readOnly = true)
    public List<StaffResponse> getAll() {
        return staffRepository.findAllByOrderBySortOrderAscIdAsc().stream()
                .map(StaffResponse::from)
                .toList();
    }

    @Transactional
    public StaffResponse create(StaffCreateRequest request, String createdBy) {
        Staff staff = Staff.create(
                request.getName(), request.getPosition(), request.getDepartment(), request.getAdmissionYear(),
                request.getPhotoUrl(), request.getIntroduction(), request.getSortOrder(), createdBy
        );
        staffRepository.save(staff);
        return StaffResponse.from(staff);
    }

    @Transactional
    public StaffResponse update(Long id, StaffUpdateRequest request, String updatedBy) {
        Staff staff = findOrThrow(id);
        staff.update(request.getPosition(), request.getPhotoUrl(), request.getIntroduction(), request.getSortOrder(), updatedBy);
        return StaffResponse.from(staff);
    }

    @Transactional
    public void delete(Long id) {
        Staff staff = findOrThrow(id);
        staffRepository.delete(staff);
    }

    private Staff findOrThrow(Long id) {
        return staffRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "운영진을 찾을 수 없어요."));
    }
}