package dxp.hourtracker.service;

import org.springframework.stereotype.Component;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;

@Component
public class WageCalculatorService {

    private static final double SHABBAT_MULTIPLIER = 1.5;
    // Default fallback values if not provided
    private static final int DEFAULT_SHABBAT_START = 15; // Friday 15:00
    private static final int DEFAULT_SHABBAT_END = 5; // Sunday 05:00

    /**
     * Calculates the total base salary for a shift, automatically applying
     * 150% rates to any hours that fall within the Shabbat window.
     */
    public double calculateShiftSalary(LocalDateTime start, LocalDateTime end, double hourlyRate,
            Double customShabbatRate, Integer shabbatStartHour, Integer shabbatEndHour) {

        int startHour = shabbatStartHour != null ? shabbatStartHour : DEFAULT_SHABBAT_START;
        int endHour = shabbatEndHour != null ? shabbatEndHour : DEFAULT_SHABBAT_END;

        // 1. Calculate Total Minutes
        long totalMinutes = Duration.between(start, end).toMinutes();
        if (totalMinutes <= 0)
            return 0.0;

        // 2. Calculate Shabbat Minutes (The intersection of Shift and Shabbat)
        long shabbatMinutes = getShabbatOverlapMinutes(start, end, startHour, endHour);
        long regularMinutes = totalMinutes - shabbatMinutes;

        // 3. Determine Effective Shabbat Rate
        double effectiveShabbatRate = (customShabbatRate != null && customShabbatRate > 0)
                ? customShabbatRate
                : (hourlyRate * SHABBAT_MULTIPLIER);

        // 4. Calculate Final Price
        double regularPay = (regularMinutes / 60.0) * hourlyRate;
        double shabbatPay = (shabbatMinutes / 60.0) * effectiveShabbatRate;

        return regularPay + shabbatPay;
    }

    private long getShabbatOverlapMinutes(LocalDateTime shiftStart, LocalDateTime shiftEnd, int startHour,
            int endHour) {
        // Find the "Relevant" Friday for this shift
        LocalDateTime shabbatStart = getRelevantFriday(shiftStart, startHour, endHour);

        // Shabbat ends Sunday morning at endHour
        LocalDateTime shabbatEnd = shabbatStart.with(TemporalAdjusters.next(DayOfWeek.SUNDAY))
                .withHour(endHour).withMinute(0);

        // Calculate Intersection
        LocalDateTime overlapStart = shiftStart.isAfter(shabbatStart) ? shiftStart : shabbatStart;
        LocalDateTime overlapEnd = shiftEnd.isBefore(shabbatEnd) ? shiftEnd : shabbatEnd;

        if (overlapStart.isAfter(overlapEnd)) {
            return 0; // No overlap
        }

        return Duration.between(overlapStart, overlapEnd).toMinutes();
    }

    private LocalDateTime getRelevantFriday(LocalDateTime date, int startHour, int endHour) {
        // If it's Sunday (early morning), the relevant Friday is the previous one.
        if (date.getDayOfWeek() == DayOfWeek.SUNDAY && date.getHour() < endHour) {
            return date.with(TemporalAdjusters.previous(DayOfWeek.FRIDAY))
                    .withHour(startHour).withMinute(0).withSecond(0);
        }
        // Otherwise, it's the current/previous Friday
        return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.FRIDAY))
                .withHour(startHour).withMinute(0).withSecond(0);
    }
}