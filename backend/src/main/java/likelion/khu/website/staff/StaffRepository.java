package likelion.khu.website.staff;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StaffRepository extends JpaRepository<Staff, Long> {
    List<Staff> findAllByOrderBySortOrderAscIdAsc();
}