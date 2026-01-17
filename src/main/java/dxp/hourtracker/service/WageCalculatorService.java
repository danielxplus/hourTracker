package dxp.hourtracker.service;

import org.springframework.stereotype.Component;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;

@Component
public class WageCalculatorService {

    private static final double SHABBAT_MULTIPLIER = 1.5;
    private static final int SHABBAT_START_HOUR = 15; // Friday 15:00
    private static final int SHABBAT_END_HOUR = 5;    // Sunday 05:00

    /**
     * Calculates the total base salary for a shift, automatically applying
     * 150% rates to any hours that fall within the Shabbat window.
     */
    public double calculateShiftSalary(LocalDateTime start, LocalDateTime end, double hourlyRate) {
        // 1. Calculate Total Minutes
        long totalMinutes = Duration.between(start, end).toMinutes();
        if (totalMinutes <= 0) return 0.0;

        // 2. Calculate Shabbat Minutes (The intersection of Shift and Shabbat)
        long shabbatMinutes = getShabbatOverlapMinutes(start, end);
        long regularMinutes = totalMinutes - shabbatMinutes;

        // 3. Calculate Final Price
        double regularPay = (regularMinutes / 60.0) * hourlyRate;
        double shabbatPay = (shabbatMinutes / 60.0) * (hourlyRate * SHABBAT_MULTIPLIER);

        return regularPay + shabbatPay;
    }

    private long getShabbatOverlapMinutes(LocalDateTime shiftStart, LocalDateTime shiftEnd) {
        // Find the "Relevant" Friday for this shift
        LocalDateTime shabbatStart = getRelevantFriday(shiftStart);

        // Shabbat ends Sunday morning at 05:00
        LocalDateTime shabbatEnd = shabbatStart.with(TemporalAdjusters.next(DayOfWeek.SUNDAY))
                .withHour(SHABBAT_END_HOUR).withMinute(0);

        // Calculate Intersection
        LocalDateTime overlapStart = shiftStart.isAfter(shabbatStart) ? shiftStart : shabbatStart;
        LocalDateTime overlapEnd = shiftEnd.isBefore(shabbatEnd) ? shiftEnd : shabbatEnd;

        if (overlapStart.isAfter(overlapEnd)) {
            return 0; // No overlap
        }

        return Duration.between(overlapStart, overlapEnd).toMinutes();
    }

    private LocalDateTime getRelevantFriday(LocalDateTime date) {
        // If it's Sunday (early morning), the relevant Friday is the previous one.
        if (date.getDayOfWeek() == DayOfWeek.SUNDAY && date.getHour() < SHABBAT_END_HOUR) {
            return date.with(TemporalAdjusters.previous(DayOfWeek.FRIDAY))
                    .withHour(SHABBAT_START_HOUR).withMinute(0).withSecond(0);
        }
        // Otherwise, it's the current/previous Friday
        return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.FRIDAY))
                .withHour(SHABBAT_START_HOUR).withMinute(0).withSecond(0);
    }
}