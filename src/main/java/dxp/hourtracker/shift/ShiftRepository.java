package dxp.hourtracker.shift;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import dxp.hourtracker.entity.User;

public interface ShiftRepository extends JpaRepository<Shift, Long> {

        List<Shift> findTop5ByUserIdOrderByDateDesc(String userId);

        List<Shift> findByUserIdAndDateBetweenOrderByDateDesc(String userId, LocalDate from, LocalDate to);

        List<Shift> findAllByUserIdOrderByDateDesc(String userId);

        // Workplace specific
        List<Shift> findAllByUserIdAndWorkplaceIdOrderByDateDesc(String userId, Long workplaceId);

        List<Shift> findByUserIdAndWorkplaceIdAndDateBetweenOrderByDateDesc(String userId, Long workplaceId,
                        LocalDate from,
                        LocalDate to);

        // Top 5 per workplace
        List<Shift> findTop5ByUserIdAndWorkplaceIdOrderByDateDesc(String userId, Long workplaceId);

        @Modifying
        @Query("UPDATE Shift s SET s.workplaceId = :workplaceId WHERE s.userId = :userId AND s.workplaceId IS NULL")
        void updateWorkplaceIdForUser(@Param("userId") String userId, @Param("workplaceId") Long workplaceId);

        /**
         * Count shifts with a specific (non-null) workplaceId.
         */
        long countByUserIdAndWorkplaceId(String userId, Long workplaceId);

        /**
         * Count shifts where workplaceId IS NULL (legacy/unassigned shifts).
         */
        @Query("SELECT COUNT(s) FROM Shift s WHERE s.userId = :userId AND s.workplaceId IS NULL")
        long countLegacyShiftsForUser(@Param("userId") String userId);
}
