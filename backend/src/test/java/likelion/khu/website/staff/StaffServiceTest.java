package likelion.khu.website.staff;

import likelion.khu.website.staff.dto.StaffCreateRequest;
import likelion.khu.website.staff.dto.StaffResponse;
import likelion.khu.website.staff.dto.StaffUpdateRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class StaffServiceTest {

    @Autowired StaffService staffService;
    @Autowired StaffRepository staffRepository;

    private StaffCreateRequest sampleRequest() {
        StaffCreateRequest req = new StaffCreateRequest();
        req.setName("시현");
        req.setPosition("회장");
        req.setDepartment("컴퓨터공학과");
        req.setAdmissionYear(22);
        req.setPhotoUrl("https://example.com/photo.jpg");
        req.setSortOrder(1);
        return req;
    }

    @Test
    void create_StoresCreatedBy() {
        staffService.create(sampleRequest(), "admin@likelion.org");

        Staff saved = staffRepository.findAll().get(0);
        assertThat(saved.getCreatedBy()).isEqualTo("admin@likelion.org");
        assertThat(saved.getUpdatedBy()).isEqualTo("admin@likelion.org");
    }

    @Test
    void getAll_OrderedBySortOrderAsc() {
        StaffCreateRequest req1 = sampleRequest();
        req1.setName("둘째");
        req1.setSortOrder(2);
        StaffCreateRequest req2 = sampleRequest();
        req2.setName("첫째");
        req2.setSortOrder(1);
        staffService.create(req1, "admin@likelion.org");
        staffService.create(req2, "admin@likelion.org");

        List<StaffResponse> all = staffService.getAll();

        assertThat(all).hasSize(2);
        assertThat(all.get(0).getName()).isEqualTo("첫째");
        assertThat(all.get(1).getName()).isEqualTo("둘째");
    }

    @Test
    void getAll_TiedSortOrder_FallsBackToIdAsc() {
        StaffCreateRequest req1 = sampleRequest();
        req1.setName("먼저생성");
        req1.setSortOrder(1);
        StaffCreateRequest req2 = sampleRequest();
        req2.setName("나중생성");
        req2.setSortOrder(1);
        staffService.create(req1, "admin@likelion.org");
        staffService.create(req2, "admin@likelion.org");

        List<StaffResponse> all = staffService.getAll();

        assertThat(all).hasSize(2);
        assertThat(all.get(0).getName()).isEqualTo("먼저생성");
        assertThat(all.get(1).getName()).isEqualTo("나중생성");
    }

    @Test
    void update_PartialUpdate_OnlyChangesProvidedFields() {
        StaffResponse created = staffService.create(sampleRequest(), "admin@likelion.org");

        StaffUpdateRequest update = new StaffUpdateRequest();
        update.setIntroduction("안녕하세요, 회장입니다.");
        StaffResponse updated = staffService.update(created.getId(), update, "admin@likelion.org");

        assertThat(updated.getIntroduction()).isEqualTo("안녕하세요, 회장입니다.");
        assertThat(updated.getPosition()).isEqualTo("회장");
        assertThat(updated.getPhotoUrl()).isEqualTo("https://example.com/photo.jpg");
        assertThat(updated.getSortOrder()).isEqualTo(1);
    }

    @Test
    void update_NameDepartmentAdmissionYear_AreImmutable_NotInUpdateDto() {
        StaffResponse created = staffService.create(sampleRequest(), "admin@likelion.org");

        StaffUpdateRequest update = new StaffUpdateRequest();
        update.setPosition("부회장");
        StaffResponse updated = staffService.update(created.getId(), update, "admin@likelion.org");

        assertThat(updated.getName()).isEqualTo("시현");
        assertThat(updated.getDepartment()).isEqualTo("컴퓨터공학과");
        assertThat(updated.getAdmissionYear()).isEqualTo(22);
    }

    @Test
    void update_UpdatesUpdatedBy() {
        StaffResponse created = staffService.create(sampleRequest(), "admin@likelion.org");

        StaffUpdateRequest update = new StaffUpdateRequest();
        update.setPosition("부회장");
        staffService.update(created.getId(), update, "other@likelion.org");

        Staff saved = staffRepository.findById(created.getId()).orElseThrow();
        assertThat(saved.getUpdatedBy()).isEqualTo("other@likelion.org");
        assertThat(saved.getCreatedBy()).isEqualTo("admin@likelion.org");
    }

    @Test
    void update_NonExistentId_ThrowsNotFound() {
        StaffUpdateRequest update = new StaffUpdateRequest();
        update.setPosition("부회장");

        assertThatThrownBy(() -> staffService.update(9999L, update, "admin@likelion.org"))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void delete_RemovesStaff() {
        StaffResponse created = staffService.create(sampleRequest(), "admin@likelion.org");

        staffService.delete(created.getId());

        assertThat(staffRepository.findById(created.getId())).isEmpty();
    }

    @Test
    void delete_NonExistentId_ThrowsNotFound() {
        assertThatThrownBy(() -> staffService.delete(9999L))
                .isInstanceOf(ResponseStatusException.class);
    }
}