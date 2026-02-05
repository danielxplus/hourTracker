package dxp.hourtracker.workplace;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkplaceRepository extends JpaRepository<Workplace, Long> {
    List<Workplace> findByUserId(String userId);

    Optional<Workplace> findByUserIdAndIsDefaultTrue(String userId);
}
