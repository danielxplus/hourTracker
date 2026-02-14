package dxp.hourtracker.service;

import dxp.hourtracker.entity.ShiftType;
import dxp.hourtracker.repository.ShiftTypeRepository;
import dxp.hourtracker.shift.Shift;
import dxp.hourtracker.shift.ShiftRepository;
import dxp.hourtracker.user.UserSettings;
import dxp.hourtracker.user.UserSettingsRepository;
import dxp.hourtracker.workplace.Workplace;
import dxp.hourtracker.workplace.WorkplaceRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DataMigrationService {

    private final UserSettingsRepository userSettingsRepository;
    private final WorkplaceRepository workplaceRepository;
    private final ShiftRepository shiftRepository;
    private final WorkplaceTemplateService templateService;

    @PostConstruct
    @Transactional
    public void migrateToMultiWorkplace() {
        log.info("Checking for necessary migration to multi-workplace structure...");

        List<UserSettings> allSettings = userSettingsRepository.findAll();

        for (UserSettings settings : allSettings) {
            String userId = settings.getUserId();

            // Check if user already has workplaces
            List<Workplace> workplaces = workplaceRepository.findByUserId(userId);
            if (!workplaces.isEmpty()) {
                continue; // Already migrated or fresh user
            }

            log.info("Migrating user {} to default workplace template...", userId);

            try {
                // Assign Mamilla Security as default during migration
                Workplace workplace = templateService.assignTemplateToUser(userId, "mamilla-security");

                // Transfer legacy rates if they exist
                if (settings.getHourlyRate() != null && settings.getHourlyRate() > 0) {
                    workplace.setHourlyRate(settings.getHourlyRate());
                    workplace.setOvertimeHourlyRate(settings.getOvertimeHourlyRate());
                    workplace.setShabatHourlyRate(settings.getShabatHourlyRate());
                    workplaceRepository.save(workplace);
                }

                // Update all existing Shifts for this user
                List<Shift> userShifts = shiftRepository.findAllByUserIdOrderByDateDesc(userId);
                int shiftCount = 0;
                for (Shift shift : userShifts) {
                    if (shift.getWorkplaceId() == null) {
                        shift.setWorkplaceId(workplace.getId());
                        shiftRepository.save(shift);
                        shiftCount++;
                    }
                }

                log.info("Migrated {} shifts to workplace {}", shiftCount, workplace.getId());
            } catch (Exception e) {
                log.error("Failed to migrate user {}: {}", userId, e.getMessage());
            }
        }
    }
}
