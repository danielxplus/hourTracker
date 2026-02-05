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

    private final UserRepository userRepository; // Assuming User entity exists or we iterate settings
    private final UserSettingsRepository userSettingsRepository;
    private final WorkplaceRepository workplaceRepository;
    private final ShiftRepository shiftRepository;
    private final ShiftTypeRepository shiftTypeRepository;

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

            log.info("Migrating user {} to default workplace...", userId);

            // Create Default Workplace from UserSettings
            Workplace defaultWorkplace = Workplace.builder()
                    .userId(userId)
                    .name("מקום עבודה ראשי") // Default name
                    .hourlyRate(settings.getHourlyRate() != null ? settings.getHourlyRate() : 0.0)
                    .overtimeHourlyRate(
                            settings.getOvertimeHourlyRate() != null ? settings.getOvertimeHourlyRate() : 0.0)
                    .shabatHourlyRate(settings.getShabatHourlyRate() != null ? settings.getShabatHourlyRate() : 0.0)
                    .isDefault(true)
                    .color("#3b82f6") // Default blue
                    .build();

            defaultWorkplace = workplaceRepository.save(defaultWorkplace);

            // Update all existing Shifts for this user
            List<Shift> userShifts = shiftRepository.findAllByUserId(userId); // You might need to add this method or
                                                                              // use findAll
            int shiftCount = 0;
            for (Shift shift : userShifts) {
                if (shift.getWorkplaceId() == null) {
                    shift.setWorkplaceId(defaultWorkplace.getId());
                    shiftRepository.save(shift);
                    shiftCount++;
                }
            }

            log.info("Migrated {} shifts to workplace {}", shiftCount, defaultWorkplace.getId());

            // Clone System Default Shift Types to this new Workplace
            List<ShiftType> systemTypes = shiftTypeRepository.findAllByWorkplaceIdIsNullOrderBySortOrderAsc();
            if (systemTypes.isEmpty()) {
                // Fallback: If no system types found, try all (legacy support)
                systemTypes = shiftTypeRepository.findAllByOrderBySortOrderAsc();
            }

            for (ShiftType sysType : systemTypes) {
                // Skip if it already has a workplaceId
                if (sysType.getWorkplaceId() != null)
                    continue;

                ShiftType clone = ShiftType.builder()
                        .code(sysType.getCode())
                        .nameHe(sysType.getNameHe())
                        .defaultStart(sysType.getDefaultStart())
                        .defaultEnd(sysType.getDefaultEnd())
                        .defaultHours(sysType.getDefaultHours())
                        .unpaidBreakMinutes(sysType.getUnpaidBreakMinutes())
                        .sortOrder(sysType.getSortOrder())
                        .workplaceId(defaultWorkplace.getId())
                        .build();

                shiftTypeRepository.save(clone);
            }
            log.info("Cloned {} shift types for workplace {}", systemTypes.size(), defaultWorkplace.getId());
        }
    }
}
