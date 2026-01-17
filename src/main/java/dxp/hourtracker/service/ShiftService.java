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

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ShiftService {

    private final ShiftRepository shiftRepository;
    private final ShiftTypeRepository shiftTypeRepository;
    private final UserSettingsRepository userSettingsRepository;

    @Transactional
    public Shift createShift(String userId, Map<String, Object> payload) {
        String shiftCode = (String) payload.get("shiftCode");
        String dateRaw = (String) payload.get("date");
        String startTimeStr = (String) payload.get("startTime");
        String endTimeStr = (String) payload.get("endTime");

        if (shiftCode == null || dateRaw == null || startTimeStr == null || endTimeStr == null) {
            throw new IllegalArgumentException("shiftCode, date, startTime, and endTime are required");
        }

        LocalDate date = LocalDate.parse(dateRaw);
        ShiftType type = shiftTypeRepository.findByCode(shiftCode)
                .orElseThrow(() -> new IllegalArgumentException("Unknown shift type: " + shiftCode));

        return saveShiftWithCalculations(userId, date, startTimeStr, endTimeStr, type, payload, null);
    }

    @Transactional
    public Shift updateShift(Long shiftId, String userId, Map<String, Object> payload) {
        Shift existing = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new IllegalArgumentException("Shift not found"));

        if (!existing.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Unauthorized to edit this shift");
        }

        // Allow partial updates or full updates. For now, assuming full payload or
        // merging.
        // Simplified: expect critical fields or fallback to existing
        // shiftCode unused warning cleanup
        payload.getOrDefault("shiftCode", existing.getShiftType());

        // ... (rest of method)
        // Logic fix: The payload usually sends 'code' (e.g. 'morning') but DB stores
        // 'nameHe' in shiftType field.
        // If payload has 'shiftCode', look it up. If not, we might need to rely on
        // existing data but re-fetching type is safer for calcs.
        // For simplicity in this iteration: Require shiftCode if changing type, else
        // assume same type derived from code if possible,
        // or just use payload if provided.

        // Actually, to correctly recalculate, we need the ShiftType entity.
        // Let's assume frontend sends full data for update like it does for create.

        String dateRaw = (String) payload.get("date");
        LocalDate date = dateRaw != null ? LocalDate.parse(dateRaw) : existing.getDate();

        String startTimeStr = (String) payload.get("startTime");
        if (startTimeStr == null)
            startTimeStr = existing.getStartTime().toString();

        String endTimeStr = (String) payload.get("endTime");
        if (endTimeStr == null)
            endTimeStr = existing.getEndTime().toString();

        // If shiftCode is provided, resolve Type. Else try to find type by existing
        // name (risky) or just require code on update.
        // Best practice: Frontend should send shiftCode.
        String code = (String) payload.get("shiftCode");
        ShiftType type;
        if (code != null) {
            type = shiftTypeRepository.findByCode(code)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown shift type: " + code));
        } else {
            // Fallback or error. For now, let's require it or find by nameHe if possible?
            // Let's require provided data for now to ensure consistency. Use 'morning' as
            // fallback is dangerous.
            // If code is missing, we might keep existing calculation?
            // Let's assume we re-calculate everything.
            throw new IllegalArgumentException("shiftCode is required for update to recalculate salary correctly.");
        }

        return saveShiftWithCalculations(userId, date, startTimeStr, endTimeStr, type, payload, existing.getId());
    }

    @Transactional
    public Shift endShift(Long shiftId, String userId) {
        Shift existing = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new IllegalArgumentException("Shift not found"));

        if (!existing.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Unauthorized to edit this shift");
        }

        // Set end time to now
        String nowTime = LocalTime.now().withSecond(0).toString(); // HH:mm
        existing.setEndTime(LocalTime.parse(nowTime));

        // We need to re-calculate everything (hours, salary).
        // We need the ShiftType to get default hours logic if relevant, strictly we
        // just calculate diff.
        // We need 'shiftCode' to find ShiftType. But Shift entity only stores
        // 'shiftType' (Hebrew Name).
        // This is a design flaw in Shift entity (not storing code).
        // Workaround: Find ShiftType by nameHe.
        ShiftType type = shiftTypeRepository.findByNameHe(existing.getShiftType())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Shift Type configuration not found for: " + existing.getShiftType()));

        // Re-run save/calc
        // Construct a 'mock' payload with existing overtime values to preserve them if
        // any
        // (Usually "End Shift" implies standard shift, maybe no overtime yet)
        Map<String, Object> payload = Map.of(
                "overtimeHours", existing.getOvertimeHours() != null ? existing.getOvertimeHours() : 0,
                "overtimeHourlyRate", existing.getOvertimeHourlyRate() != null ? existing.getOvertimeHourlyRate() : 0);

        return saveShiftWithCalculations(userId, existing.getDate(), existing.getStartTime().toString(), nowTime, type,
                payload,
                existing.getId());
    }

    private Shift saveShiftWithCalculations(String userId, LocalDate date, String start, String end, ShiftType type,
            Map<String, Object> payload, Long existingId) {
        double hours = calculateHours(start, end);

        // Get rate from UserSettings (or default 51.0)
        UserSettings settings = userSettingsRepository.findByUserId(userId).orElse(null);
        double rate = 51.0;
        if (settings != null && settings.getHourlyRate() != null && settings.getHourlyRate() > 0) {
            rate = settings.getHourlyRate();
        }

        double baseSalary = hours * rate;

        Double overtimeHours = null;
        Double overtimeHourlyRate = null;
        Double overtimeSalary = null;

        Object overtimeHoursVal = payload.get("overtimeHours");
        Object overtimeRateVal = payload.get("overtimeHourlyRate");

        if (overtimeHoursVal instanceof Number number) {
            overtimeHours = number.doubleValue();
        }
        if (overtimeRateVal instanceof Number number) {
            overtimeHourlyRate = number.doubleValue();
        }

        // Logic: If overtime rate is missing, calculate from base rate (1.25x) or
        // settings
        if (overtimeHours != null && overtimeHours > 0 && overtimeHourlyRate == null) {
            if (settings != null && settings.getOvertimeHourlyRate() != null && settings.getOvertimeHourlyRate() > 0) {
                overtimeHourlyRate = settings.getOvertimeHourlyRate();
            } else {
                overtimeHourlyRate = rate * 1.25;
            }
        }

        if (overtimeHours != null && overtimeHours > 0 && overtimeHourlyRate != null && overtimeHourlyRate > 0) {
            overtimeSalary = overtimeHours * overtimeHourlyRate;
        } else {
            overtimeHours = 0.0;
            overtimeHourlyRate = null; // or keep as null
            overtimeSalary = 0.0;
        }

        double totalSalary = baseSalary + (overtimeSalary != null ? overtimeSalary : 0.0);

        // Builder removed as we chain directly below

        // If it's an update, we should ensure we don't lose other fields like
        // 'tipAmount' if not in payload.
        // To do this safely, if existingId is passed, we should have the 'existing'
        // object.
        // Refactoring helper signature to take 'existingShift' optional.

        return shiftRepository.save(Shift.builder()
                .id(existingId)
                .userId(userId)
                .date(date)
                .startTime(LocalTime.parse(start))
                .endTime(LocalTime.parse(end))
                .shiftType(type.getNameHe()) // Storing Hebrew Name
                .hours(hours + (overtimeHours != null ? overtimeHours : 0.0))
                .salary(totalSalary)
                .overtimeHours(overtimeHours)
                .overtimeHourlyRate(overtimeHourlyRate)
                .overtimeSalary(overtimeSalary)
                .tipAmount(payload.containsKey("tipAmount") ? ((Number) payload.get("tipAmount")).doubleValue()
                        : (existingId != null ? getExistingTip(existingId) : 0.0))
                .build());
    }

    private Double getExistingTip(Long id) {
        return shiftRepository.findById(id).map(Shift::getTipAmount).orElse(0.0);
    }

    private double calculateHours(String start, String end) {
        if (start == null || end == null)
            return 0;
        String[] s = start.split(":");
        String[] e = end.split(":");
        double sh = Double.parseDouble(s[0]) + Double.parseDouble(s[1]) / 60.0;
        double eh = Double.parseDouble(e[0]) + Double.parseDouble(e[1]) / 60.0;

        if (eh < sh) {
            eh += 24.0; // Next day
        }
        return eh - sh;
    }
}
