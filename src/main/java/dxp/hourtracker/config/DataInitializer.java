package dxp.hourtracker.config;

import dxp.hourtracker.entity.ShiftType;
import dxp.hourtracker.repository.ShiftTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalTime;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

        private final ShiftTypeRepository shiftTypeRepository;

        @Override
        public void run(String... args) {
                // Base hourly salary – 51 NIS by default
                double baseRate = 51.0;

                // Morning: 06:30 - 15:30 (9h) -> 8h Pay (60m deduction)
                createIfMissing("MORNING", "משמרת בוקר",
                        LocalTime.of(6, 30), LocalTime.of(15, 30), 8.0, 60);

                // Evening: 14:30 - 23:15 (8h 45m) -> 8h 15m Pay (30m deduction)
                createIfMissing("EVENING", "משמרת ערב",
                        LocalTime.of(14, 30), LocalTime.of(23, 15), 8.0, 30);

                // Night: 22:30 - 07:15 (8.75h) -> 8.45 Pay (Assuming full pay/custom logic)
                // Note: 8h 45m is 8.75. If you want exactly 8.45, set deduction to 18.
                createIfMissing("NIGHT", "משמרת לילה",
                        LocalTime.of(22, 30), LocalTime.of(7, 15), 8.45, 0);

                // Middle: 12:00 - 21:00 (9h) -> 8h Pay (60m deduction)
                createIfMissing("MIDDLE", "משמרת מידל",
                        LocalTime.of(12, 0), LocalTime.of(21, 0), 8.0, 60);

                // 7AM: 07:30 - 16:30 (9h) -> 8h Pay (60m deduction)
                createIfMissing("7AM_UNTIL_4", "07:30 - 16:30",
                        LocalTime.of(7, 30), LocalTime.of(16, 30), 8.0, 60);

                // 4PM: 16:00 - 00:30 (8.5h) -> 8h Pay (30m deduction)
                createIfMissing("4PM_UNTIL_12", "16:00 - 00:30",
                        LocalTime.of(16, 0), LocalTime.of(0, 30), 8.0, 30);
        }

        private void createIfMissing(
                        String code,
                        String nameHe,
                        LocalTime defaultStart,
                        LocalTime defaultEnd,
                        Double defaultHours,
                        Integer deductionMinutes) {

                ShiftType shiftType = shiftTypeRepository.findByCode(code)
                        .orElse(ShiftType.builder().code(code).build());

                shiftType.setNameHe(nameHe);
                shiftType.setDefaultStart(defaultStart);
                shiftType.setDefaultEnd(defaultEnd);
                shiftType.setDefaultHours(defaultHours);
                shiftType.setUnpaidBreakMinutes(deductionMinutes);

                shiftTypeRepository.save(shiftType);
        }
}
