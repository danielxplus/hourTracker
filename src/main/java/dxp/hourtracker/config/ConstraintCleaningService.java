package dxp.hourtracker.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Service to clean up legacy database constraints that block multi-workplace
 * functionality.
 * Hibernate's ddl-auto=update does not automatically drop old unique indexes.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ConstraintCleaningService implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        log.info("Starting legacy constraint cleanup...");

        try {
            // Drop the table-wide unique constraint on shift_types.code
            // This name was identified from the detailed error logs.
            String sql = "ALTER TABLE shift_types DROP INDEX UKi4ew2e57xwrdxoc337g8geso1";
            jdbcTemplate.execute(sql);
            log.info("Successfully dropped legacy index UKi4ew2e57xwrdxoc337g8geso1 on shift_types");
        } catch (Exception e) {
            // If it fails, it's likely because the index was already dropped or doesn't
            // exist.
            // We ignore this to ensure the app boots normally.
            log.debug("Legacy index UKi4ew2e57xwrdxoc337g8geso1 not found or already dropped. Skipping.");
        }

        log.info("Legacy constraint cleanup completed.");
    }
}
