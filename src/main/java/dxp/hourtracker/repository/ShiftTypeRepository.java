package dxp.hourtracker.repository;

import dxp.hourtracker.entity.ShiftType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ShiftTypeRepository extends JpaRepository<ShiftType, Long> {

    Optional<ShiftType> findByCode(String code);
}


