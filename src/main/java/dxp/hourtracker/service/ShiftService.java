package dxp.hourtracker.service;

import dxp.hourtracker.entity.ShiftType;
import dxp.hourtracker.repository.ShiftTypeRepository;
import dxp.hourtracker.shift.Shift;
import dxp.hourtracker.shift.ShiftRepository;
import dxp.hourtracker.user.UserSettings;
import dxp.hourtracker.user.UserSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ShiftService {

    private final ShiftRepository shiftRepository;
    private final ShiftTypeRepository shiftTypeRepository;
    private final UserSettingsRepository userSettingsRepository;
    private final dxp.hourtracker.workplace.WorkplaceRepository workplaceRepository; // Workplace support
    private final WageCalculatorService wageCalculator;

    @Transactional
    public Shift createShift(String userId, Map<String, Object> payload) {
        String shiftCode = (String) payload.get("shiftCode");
        String dateRaw = (String) payload.get("date");
        String startTimeStr = (String) payload.get("startTime");
        String endTimeStr = (String) payload.get("endTime");

        if (shiftCode == null || dateRaw == null || startTimeStr == null || endTimeStr == null) {
            throw new IllegalArgumentException("shiftCode, date, startTime, and endTime are required");
        }

        Long workplaceId = null;
        if (payload.containsKey("workplaceId") && payload.get("workplaceId") instanceof Number n) {
            workplaceId = n.longValue();
        }

        if (workplaceId != null) {
            final Long wpId = workplaceId; // effective final for lambda
            dxp.hourtracker.workplace.Workplace wp = workplaceRepository.findById(wpId)
                    .orElseThrow(() -> new IllegalArgumentException("Workplace not found"));
            if (!wp.getUserId().equals(userId)) {
                throw new IllegalArgumentException("Unauthorized workplace access");
            }
        }

        // Validation: If workplaceId is provided, verify ownership?
        // saveShiftWithCalculations will fetch and verify.

        LocalDate date = LocalDate.parse(dateRaw);
        ShiftType type;
        if (workplaceId != null) {
            type = shiftTypeRepository.findByCodeAndWorkplaceId(shiftCode, workplaceId)
                    .orElseGet(() -> shiftTypeRepository.findFirstByCodeAndWorkplaceIdIsNull(shiftCode)
                            .orElseThrow(() -> new IllegalArgumentException("Unknown shift type: " + shiftCode)));
        } else {
            type = shiftTypeRepository.findFirstByCodeAndWorkplaceIdIsNull(shiftCode)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown shift type: " + shiftCode));
        }

        return saveShiftWithCalculations(userId, workplaceId, date, startTimeStr, endTimeStr, type, payload, null);

    }

    @Transactional
    public Shift updateShift(Long shiftId, String userId, Map<String, Object> payload) {
        Shift existing = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new IllegalArgumentException("Shift not found"));

        if (!existing.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Unauthorized to edit this shift");
        }

        // Workplace ID: Use payload if present (moving shift?), else existing
        Long workplaceId = existing.getWorkplaceId();
        if (payload.containsKey("workplaceId") && payload.get("workplaceId") instanceof Number n) {
            workplaceId = n.longValue();
        }

        // Logic to determine ShiftType
        String code = (String) payload.get("shiftCode");
        ShiftType type;
        if (code != null) {
            if (workplaceId != null) {
                type = shiftTypeRepository.findByCodeAndWorkplaceId(code, workplaceId)
                        .orElseGet(() -> shiftTypeRepository.findFirstByCodeAndWorkplaceIdIsNull(code)
                                .orElseThrow(() -> new IllegalArgumentException("Unknown shift type: " + code)));
            } else {
                type = shiftTypeRepository.findFirstByCodeAndWorkplaceIdIsNull(code)
                        .orElseThrow(() -> new IllegalArgumentException("Unknown shift type: " + code));
            }
        } else {
            // Fallback: try to find by existing Hebrew name
            if (workplaceId != null) {
                type = shiftTypeRepository.findByNameHeAndWorkplaceId(existing.getShiftType(), workplaceId)
                        .orElseGet(() -> shiftTypeRepository
                                .findFirstByNameHeAndWorkplaceIdIsNull(existing.getShiftType())
                                .orElseThrow(() -> new IllegalArgumentException("Shift Type configuration not found")));
            } else {
                type = shiftTypeRepository.findFirstByNameHeAndWorkplaceIdIsNull(existing.getShiftType())
                        .orElseThrow(() -> new IllegalArgumentException("Shift Type configuration not found"));
            }
        }

        // Parse Date/Time, falling back to existing if null
        String dateRaw = (String) payload.get("date");
        LocalDate date = dateRaw != null ? LocalDate.parse(dateRaw) : existing.getDate();

        String startTimeStr = (String) payload.getOrDefault("startTime", existing.getStartTime().toString());
        String endTimeStr = (String) payload.getOrDefault("endTime", existing.getEndTime().toString());

        return saveShiftWithCalculations(userId, workplaceId, date, startTimeStr, endTimeStr, type, payload,
                existing.getId());

    }

    @Transactional
    public Shift endShift(Long shiftId, String userId) {
        Shift existing = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new IllegalArgumentException("Shift not found"));

        if (!existing.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Unauthorized");
        }

        // Set end time to NOW
        String nowTime = LocalTime.now().withSecond(0).toString();
        existing.setEndTime(LocalTime.parse(nowTime));

        // Find type
        ShiftType type;
        if (existing.getWorkplaceId() != null) {
            type = shiftTypeRepository.findByNameHeAndWorkplaceId(existing.getShiftType(), existing.getWorkplaceId())
                    .orElseGet(() -> shiftTypeRepository.findFirstByNameHeAndWorkplaceIdIsNull(existing.getShiftType())
                            .orElseThrow(() -> new IllegalArgumentException("Shift Type not found")));
        } else {
            type = shiftTypeRepository.findFirstByNameHeAndWorkplaceIdIsNull(existing.getShiftType())
                    .orElseThrow(() -> new IllegalArgumentException("Shift Type not found"));
        }

        // Preserve existing manual overtime if any
        Map<String, Object> payload = Map.of(
                "overtimeHours", existing.getOvertimeHours() != null ? existing.getOvertimeHours() : 0,
                "overtimeHourlyRate", existing.getOvertimeHourlyRate() != null ? existing.getOvertimeHourlyRate() : 0);

        return saveShiftWithCalculations(userId, existing.getWorkplaceId(), existing.getDate(),
                existing.getStartTime().toString(), nowTime, type,
                payload, existing.getId());

    }

    private Shift saveShiftWithCalculations(String userId, Long workplaceId, LocalDate date, String startStr,
            String endStr,
            ShiftType type,
            Map<String, Object> payload, Long existingId) {

        // 1. Prepare Times
        LocalTime startTime = LocalTime.parse(startStr);
        LocalTime endTime = LocalTime.parse(endStr);

        LocalDateTime startDt = LocalDateTime.of(date, startTime);
        LocalDateTime endDt = LocalDateTime.of(date, endTime);

        // Handle overnight shifts (if end is before start, it's next day)
        if (endTime.isBefore(startTime)) {
            endDt = endDt.plusDays(1);
        }

        // 2. Calculate Gross Duration
        long grossMinutes = Duration.between(startDt, endDt).toMinutes();

        // 3. Get Deduction (Break)
        int deductionMinutes = (type.getUnpaidBreakMinutes() != null) ? type.getUnpaidBreakMinutes() : 0;

        // 4. Calculate Net Hours (Gross - Break)
        double netMinutes = Math.max(0, grossMinutes - deductionMinutes);
        double hours = netMinutes / 60.0;

        // 5. Get Rates (Preferred: Workplace, Fallback: UserSettings/Default)
        Double currentRate = 51.0;
        Double currentOvertimeRate = null;
        Double currentShabatRate = null;
        Integer shabbatStart = null;
        Integer shabbatEnd = null;

        // Try fetch workplace
        if (workplaceId != null) {
            dxp.hourtracker.workplace.Workplace wp = workplaceRepository.findById(workplaceId).orElse(null);
            if (wp != null && wp.getUserId().equals(userId)) {
                if (wp.getHourlyRate() != null)
                    currentRate = wp.getHourlyRate();
                if (wp.getOvertimeHourlyRate() != null)
                    currentOvertimeRate = wp.getOvertimeHourlyRate();

                // Get Shabat settings
                if (wp.getShabatHourlyRate() != null)
                    currentShabatRate = wp.getShabatHourlyRate();

                shabbatStart = wp.getShabbatStartHour();
                shabbatEnd = wp.getShabbatEndHour();
            }
        } else {
            // Fallback to legacy UserSettings
            UserSettings settings = userSettingsRepository.findByUserId(userId).orElse(null);
            if (settings != null && settings.getHourlyRate() != null && settings.getHourlyRate() > 0) {
                currentRate = settings.getHourlyRate();
            }
            if (settings != null && settings.getOvertimeHourlyRate() != null) {
                currentOvertimeRate = settings.getOvertimeHourlyRate();
            }
            if (settings != null && settings.getShabatHourlyRate() != null) {
                currentShabatRate = settings.getShabatHourlyRate();
            }
        }

        // 6. Calculate Base Salary
        double baseSalary = wageCalculator.calculateShiftSalary(startDt, endDt, currentRate, currentShabatRate,
                shabbatStart, shabbatEnd);

        // 7. Handle Manual Overtime (Added on top)
        Double overtimeHours = null;
        Double overtimeHourlyRate = null;
        Double overtimeSalary = 0.0;

        Object overtimeHoursVal = payload.get("overtimeHours");
        if (overtimeHoursVal instanceof Number n)
            overtimeHours = n.doubleValue();

        if (overtimeHours != null && overtimeHours > 0) {
            Object overtimeRateVal = payload.get("overtimeHourlyRate");
            if (overtimeRateVal instanceof Number n) {
                overtimeHourlyRate = n.doubleValue();
            } else if (currentOvertimeRate != null) {
                overtimeHourlyRate = currentOvertimeRate;
            } else {
                overtimeHourlyRate = currentRate * 1.25; // Default 125%
            }
            overtimeSalary = overtimeHours * overtimeHourlyRate;
        }

        double totalSalary = baseSalary + overtimeSalary;

        // 8. Handle Tips
        double tipAmount = 0.0;
        if (payload.containsKey("tipAmount") && payload.get("tipAmount") instanceof Number n) {
            tipAmount = n.doubleValue();
        } else if (existingId != null) {
            // Preserve existing tip
            tipAmount = shiftRepository.findById(existingId).map(Shift::getTipAmount).orElse(0.0);
        }

        // 9. Save
        return shiftRepository.save(Shift.builder()
                .id(existingId)
                .userId(userId)
                .workplaceId(workplaceId)
                .date(date)
                .startTime(startTime)
                .endTime(endTime)
                .shiftType(type.getNameHe())
                .hours(hours + (overtimeHours != null ? overtimeHours : 0.0)) // Total hours tracked
                .salary(totalSalary)
                .overtimeHours(overtimeHours)
                .overtimeHourlyRate(overtimeHourlyRate)
                .overtimeSalary(overtimeSalary)
                .tipAmount(tipAmount)
                .build());
    }
}