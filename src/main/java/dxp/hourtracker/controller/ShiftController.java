package dxp.hourtracker.controller;

import dxp.hourtracker.entity.ShiftType;
import dxp.hourtracker.repository.ShiftTypeRepository;
import dxp.hourtracker.shift.Shift;
import dxp.hourtracker.shift.ShiftRepository;
import dxp.hourtracker.user.UserSettings;
import dxp.hourtracker.user.UserSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ShiftController {

    private final ShiftTypeRepository shiftTypeRepository;
    private final ShiftRepository shiftRepository;
    private final UserSettingsRepository userSettingsRepository;

    @GetMapping("/shift-types")
    public List<Map<String, Object>> getShiftTypes() {
        return shiftTypeRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    @PostMapping("/shifts")
    public Map<String, Object> createShift(
            @AuthenticationPrincipal OAuth2User principal,
            @RequestBody Map<String, Object> body
    ) {
        if (principal == null) {
            throw new IllegalStateException("User must be authenticated to create shifts");
        }
        String userId = principal.getName();

        String shiftCode = (String) body.get("shiftCode");
        String dateRaw = (String) body.get("date");

        if (shiftCode == null || dateRaw == null) {
            throw new IllegalArgumentException("shiftCode and date are required");
        }

        LocalDate date = LocalDate.parse(dateRaw);

        ShiftType type = shiftTypeRepository.findByCode(shiftCode)
                .orElseThrow(() -> new IllegalArgumentException("Unknown shift type: " + shiftCode));

        double hours = type.getDefaultHours() != null ? type.getDefaultHours() : 0.0;
        double rate = type.getBaseHourlyRate() != null ? type.getBaseHourlyRate() : 0.0;
        double baseSalary = hours * rate;

        Double overtimeHours = null;
        Double overtimeHourlyRate = null;
        Double overtimeSalary = null;

        Object overtimeHoursVal = body.get("overtimeHours");
        Object overtimeRateVal = body.get("overtimeHourlyRate");
        if (overtimeHoursVal instanceof Number number) {
            overtimeHours = number.doubleValue();
        }
        if (overtimeRateVal instanceof Number number) {
            overtimeHourlyRate = number.doubleValue();
        }

        // If overtime hours provided but no rate, use saved rate from settings
        if (overtimeHours != null && overtimeHours > 0 && overtimeHourlyRate == null) {
            UserSettings settings = userSettingsRepository.findByUserId(userId).orElse(null);
            if (settings != null && settings.getOvertimeHourlyRate() != null && settings.getOvertimeHourlyRate() > 0) {
                overtimeHourlyRate = settings.getOvertimeHourlyRate();
            }
        }

        if (overtimeHours != null && overtimeHours > 0 && overtimeHourlyRate != null && overtimeHourlyRate > 0) {
            overtimeSalary = overtimeHours * overtimeHourlyRate;
        } else {
            overtimeHours = 0.0;
            overtimeHourlyRate = null;
            overtimeSalary = 0.0;
        }

        double totalSalary = baseSalary + (overtimeSalary != null ? overtimeSalary : 0.0);

        Shift shift = Shift.builder()
                .userId(userId)
                .date(date)
                .startTime(type.getDefaultStart())
                .endTime(type.getDefaultEnd())
                .shiftType(type.getNameHe())
                .hours(hours + (overtimeHours != null ? overtimeHours : 0.0))
                .salary(totalSalary)
                .overtimeHours(overtimeHours)
                .overtimeHourlyRate(overtimeHourlyRate)
                .overtimeSalary(overtimeSalary)
                .build();

        Shift saved = shiftRepository.save(shift);

        Map<String, Object> response = new HashMap<>();
        response.put("id", saved.getId());
        response.put("date", saved.getDate());
        response.put("shiftType", saved.getShiftType());
        response.put("hours", saved.getHours());
        response.put("salary", saved.getSalary());
        response.put("overtimeHours", saved.getOvertimeHours());
        response.put("overtimeSalary", saved.getOvertimeSalary());
        response.put("tipAmount", saved.getTipAmount());
        return response;
    }

    private Map<String, Object> toDto(ShiftType type) {
        Map<String, Object> m = new HashMap<>();
        m.put("code", type.getCode());
        m.put("nameHe", type.getNameHe());
        m.put("defaultStart", type.getDefaultStart());
        m.put("defaultEnd", type.getDefaultEnd());
        m.put("defaultHours", type.getDefaultHours());
        m.put("baseHourlyRate", type.getBaseHourlyRate());
        return m;
    }

    @PostMapping("/shifts/{shiftId}/tip")
    public Map<String, Object> addTipToShift(
        @AuthenticationPrincipal OAuth2User principal,
        @PathVariable Long shiftId,
        @RequestBody Map<String, Object> body
    ) {
        if (principal == null) {
            throw new IllegalStateException("User must be authenticated to add a tip");
        }
        String userId = principal.getName();
        Shift shift = shiftRepository.findById(shiftId)
            .orElseThrow(() -> new IllegalArgumentException("Shift not found"));
        Object tipValueObj = body.get("tipAmount");
        if (!(tipValueObj instanceof Number)) {
            throw new IllegalArgumentException("tipAmount must be a numeric value");
        }
        double tipAmount = ((Number) tipValueObj).doubleValue();
        shift.setTipAmount(tipAmount);
        shiftRepository.save(shift);

        Map<String, Object> resp = new HashMap<>();
        resp.put("id", shift.getId());
        resp.put("tipAmount", shift.getTipAmount());
        return resp;
    }
}


