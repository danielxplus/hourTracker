package dxp.hourtracker.shift;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import dxp.hourtracker.entity.User;

public interface ShiftRepository extends JpaRepository<Shift, Long> {

    List<Shift> findTop5ByUserIdOrderByDateDesc(String userId);

    List<Shift> findByUserIdAndDateBetweenOrderByDateDesc(String userId, LocalDate from, LocalDate to);

    List<Shift> findAllByUserIdOrderByDateDesc(String userId);
}
