package dxp.hourtracker.shift;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ShiftRepository extends JpaRepository<Shift, Long> {

    List<Shift> findTop5ByUserIdOrderByDateDesc(String userId);

    List<Shift> findByUserIdAndDateBetweenOrderByDateDesc(String userId, LocalDate from, LocalDate to);
}


