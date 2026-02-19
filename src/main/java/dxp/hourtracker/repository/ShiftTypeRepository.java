package dxp.hourtracker.repository;

import dxp.hourtracker.entity.ShiftType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ShiftTypeRepository extends JpaRepository<ShiftType, Long> {

    Optional<ShiftType> findByCode(String code);

    Optional<ShiftType> findFirstByCodeAndWorkplaceIdIsNull(String code);

    Optional<ShiftType> findByCodeAndWorkplaceId(String code, Long workplaceId);

    Optional<ShiftType> findByNameHe(String nameHe);

    Optional<ShiftType> findFirstByNameHeAndWorkplaceIdIsNull(String nameHe);

    Optional<ShiftType> findByNameHeAndWorkplaceId(String nameHe, Long workplaceId);

    List<ShiftType> findAllByWorkplaceIdOrderBySortOrderAsc(Long workplaceId);

    // For system defaults (workplaceId is null)
    List<ShiftType> findAllByWorkplaceIdIsNullOrderBySortOrderAsc();

    List<ShiftType> findAllByOrderBySortOrderAsc();

}
