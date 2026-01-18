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

                createIfMissing(
                                "MORNING",
                                "משמרת בוקר",
                                LocalTime.of(6, 30),
                                LocalTime.of(15, 30),
                                8.0);

                createIfMissing(
                                "EVENING",
                                "משמרת ערב",
                                LocalTime.of(14, 30),
                                LocalTime.of(23, 15),
                                8.0);

                createIfMissing(
                                "NIGHT",
                                "משמרת לילה",
                                LocalTime.of(22, 30),
                                LocalTime.of(7, 15),
                                8.45);
                createIfMissing(
                                "MIDDLE",
                                "משמרת מידל",
                                LocalTime.of(11, 30),
                                LocalTime.of(20, 30),
                                8.0);
                createIfMissing(
                                "4PM_UNTIL_12",
                                "16:00 - 00:30",
                                LocalTime.of(16, 0),
                                LocalTime.of(0, 30),
                                8.0);
                createIfMissing(
                                "7AM_UNTIL_4",
                                "07:30 - 16:30",
                                LocalTime.of(7, 30),
                                LocalTime.of(16, 30),
                                8.0);
        }

        private void createIfMissing(
                        String code,
                        String nameHe,
                        LocalTime defaultStart,
                        LocalTime defaultEnd,
                        Double defaultHours) {
                shiftTypeRepository.findByCode(code)
                                .orElseGet(() -> shiftTypeRepository.save(
                                                ShiftType.builder()
                                                                .code(code)
                                                                .nameHe(nameHe)
                                                                .defaultStart(defaultStart)
                                                                .defaultEnd(defaultEnd)
                                                                .defaultHours(defaultHours)
                                                                .build()));
        }
}
