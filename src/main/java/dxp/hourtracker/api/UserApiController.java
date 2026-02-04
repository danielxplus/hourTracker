package dxp.hourtracker.api;

import dxp.hourtracker.entity.User;
import dxp.hourtracker.repository.UserRepository;
import dxp.hourtracker.shift.Shift;
import dxp.hourtracker.shift.ShiftRepository;
import dxp.hourtracker.user.UserSettings;
import dxp.hourtracker.user.UserSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.DayOfWeek;
import java.time.temporal.TemporalAdjusters;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UserApiController {

    private final UserRepository userRepository;
    private final UserSettingsRepository userSettingsRepository;
    private final ShiftRepository shiftRepository;

    @GetMapping("/me")
    public Map<String, Object> me(@AuthenticationPrincipal OAuth2User principal) {
        Map<String, Object> response = new HashMap<>();
        if (principal == null) {
            response.put("displayName", "אורח");
            return response;
        }
        String externalId = principal.getName();
        String name = principal.getAttribute("name");
        if (name == null) {
            name = principal.getAttribute("given_name");
        }
        if (name == null) {
            name = externalId;
        }
        String email = principal.getAttribute("email");

        User user = userRepository.findByExternalId(externalId).orElse(null);
        if (user == null) {
            user = userRepository.save(User.builder()
                    .externalId(externalId)
                    .displayName(name)
                    .email(email)
                    .build());
        } else {
            // only fill missing fields; don't override a custom display name
            if (user.getDisplayName() == null || user.getDisplayName().isBlank()) {
                user.setDisplayName(name);
            }
            if (email != null && !email.isBlank()) {
                user.setEmail(email);
            }
            userRepository.save(user);
        }

        response.put("displayName", user.getDisplayName() != null ? user.getDisplayName() : "אורח");
        response.put("email", user.getEmail());

        // Add settings info (isPremium and theme)
        UserSettings settings = userSettingsRepository.findByUserId(externalId)
                .orElseGet(() -> {
                    UserSettings s = new UserSettings();
                    s.setUserId(externalId);
                    s.setHourlyRate(51.0);
                    s.setOvertimeHourlyRate(51.0 * 1.25);
                    s.setShabatHourlyRate(51.0 * 1.50);
                    s.setPremiumExpiresAt(LocalDateTime.now().plusDays(7));
                    return userSettingsRepository.save(s);
                });

        response.put("isPremium", settings.getIsPremium());
        response.put("premiumExpiresAt", settings.getPremiumExpiresAt());
        response.put("themePreference",
                settings.getThemePreference() != null ? settings.getThemePreference() : "default");

        return response;
    }

    @GetMapping("/summary")
    public Map<String, Object> summary(@AuthenticationPrincipal OAuth2User principal) {
        try {
            Map<String, Object> response = new HashMap<>();
            if (principal == null) {
                response.put("monthHours", 0);
                response.put("weekHours", 0);
                response.put("hourlyRate", 0);
                response.put("expectedMonthSalary", 0);
                response.put("recentShifts", List.of());
                response.put("tipAmount", 0);
                return response;
            }

            String userId = principal.getName();

            UserSettings settings = userSettingsRepository
                    .findByUserId(userId)
                    .orElseGet(() -> {
                        UserSettings s = new UserSettings();
                        s.setUserId(userId);
                        s.setHourlyRate(0.0);
                        return userSettingsRepository.save(s);
                    });

            // --- Monthly Calculation (Start from 1st of month at 06:29) ---
            YearMonth thisMonth = YearMonth.now();
            LocalDate startOfMonthDate = thisMonth.atDay(1);
            LocalDate endOfMonthDate = thisMonth.atEndOfMonth();
            LocalDateTime tempBoundaryMonth = LocalDateTime.of(startOfMonthDate, LocalTime.of(6, 29));
            if (LocalDateTime.now().isBefore(tempBoundaryMonth)) {
                tempBoundaryMonth = tempBoundaryMonth.minusMonths(1);
            }
            final LocalDateTime effectiveBoundaryMonth = tempBoundaryMonth;

            // Fetch roughly by date range first
            List<Shift> monthShiftsCandidates = shiftRepository.findByUserIdAndDateBetweenOrderByDateDesc(
                    userId, startOfMonthDate.minusDays(1), endOfMonthDate);
            // Note: minusDays(1) because a shift on the 1st ending *after* 6:30 might
            // technically belong?
            // Actually, if date is 1st, startTime >= 06:30.

            // Re-fetch strictly by date range [1st, End] is usually enough if date
            // represents "shift date".
            // But let's stick to the requested logic: count from X time.
            // If shift date is BEFORE cutoff, we ignore. If shift date is defined as "start
            // date",
            // we just need date >= 1st. AND if date == 1st, startTime >= 06:30.

            List<Shift> monthShifts = shiftRepository.findByUserIdAndDateBetweenOrderByDateDesc(
                    userId, startOfMonthDate, endOfMonthDate);

            double monthHours = monthShifts.stream()
                    .filter(s -> {
                        LocalDateTime shiftStart = LocalDateTime.of(s.getDate(),
                                s.getStartTime() != null ? s.getStartTime() : LocalTime.MIN);
                        return !shiftStart.isBefore(effectiveBoundaryMonth);
                    })
                    .mapToDouble(s -> (s.getHours() != null ? s.getHours() : 0.0))
                    .sum();

            // --- Weekly Calculation (Start from most recent Sunday at 06:29) ---
            LocalDate today = LocalDate.now();
            // Find most recent Sunday (or today if today is Sunday)
            LocalDate previousSunday = today
                    .with(TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY));
            LocalDateTime tempBoundaryWeek = LocalDateTime.of(previousSunday, LocalTime.of(6, 29));
            if (LocalDateTime.now().isBefore(tempBoundaryWeek)) {
                tempBoundaryWeek = tempBoundaryWeek.minusWeeks(1);
            }
            final LocalDateTime effectiveBoundaryWeek = tempBoundaryWeek;

            List<Shift> weekShifts = shiftRepository.findByUserIdAndDateBetweenOrderByDateDesc(
                    userId, previousSunday, today);

            double weekHours = weekShifts.stream()
                    .filter(s -> {
                        LocalDateTime shiftStart = LocalDateTime.of(s.getDate(),
                                s.getStartTime() != null ? s.getStartTime() : LocalTime.MIN);
                        return !shiftStart.isBefore(effectiveBoundaryWeek);
                    })
                    .mapToDouble(s -> (s.getHours() != null ? s.getHours() : 0.0))
                    .sum();

            // Calculate expected salary based on the MONTHLY specific shifts (filtered)
            // Or should expected salary match the "Month Hours"? Yes, consistent.
            double expectedSalary = monthShifts.stream()
                    .filter(s -> {
                        LocalDateTime shiftStart = LocalDateTime.of(s.getDate(),
                                s.getStartTime() != null ? s.getStartTime() : LocalTime.MIN);
                        return !shiftStart.isBefore(effectiveBoundaryMonth);
                    })
                    .mapToDouble(s -> (s.getSalary() != null ? s.getSalary() : 0.0))
                    .sum();

            double totalTips = monthShifts.stream()
                    .filter(s -> {
                        LocalDateTime shiftStart = LocalDateTime.of(s.getDate(),
                                s.getStartTime() != null ? s.getStartTime() : LocalTime.MIN);
                        return !shiftStart.isBefore(effectiveBoundaryMonth);
                    })
                    .mapToDouble(s -> s.getTipAmount() != null ? s.getTipAmount() : 0.0)
                    .sum();

            double hourlyRate = settings.getHourlyRate() != null ? settings.getHourlyRate() : 0.0;

            List<Map<String, Object>> recent = shiftRepository
                    .findTop5ByUserIdOrderByDateDesc(userId)
                    .stream()
                    .map(s -> {
                        Map<String, Object> m = new HashMap<>();
                        m.put("id", s.getId());
                        m.put("date", s.getDate());
                        m.put("startTime", s.getStartTime());
                        m.put("endTime", s.getEndTime());
                        m.put("shiftType", s.getShiftType());
                        m.put("hours", s.getHours());
                        m.put("overtimeHours", s.getOvertimeHours());
                        m.put("overtimeSalary", s.getOvertimeSalary());

                        m.put("salary", s.getSalary());
                        m.put("tipAmount", s.getTipAmount());

                        return m;
                    })
                    .toList();

            response.put("monthHours", monthHours);
            response.put("weekHours", weekHours);
            response.put("hourlyRate", hourlyRate);
            response.put("expectedMonthSalary", expectedSalary);
            response.put("recentShifts", recent);
            response.put("totalTips", totalTips);
            return response;
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }

    @GetMapping("/settings")
    public Map<String, Object> settings(@AuthenticationPrincipal OAuth2User principal) {
        Map<String, Object> response = new HashMap<>();
        if (principal == null) {
            response.put("hourlyRate", 0);
            response.put("overtimeHourlyRate", 0);
            response.put("shabatHourlyRate", 0);
            response.put("isPremium", false);
            response.put("premiumExpiresAt", null);
            response.put("themePreference", "default");
            return response;
        }
        String userId = principal.getName();

        // Default base logic: 51.0 is the system-wide default
        Double defaultBase = 51.0;

        UserSettings settings = userSettingsRepository
                .findByUserId(userId)
                .orElseGet(() -> {
                    UserSettings s = new UserSettings();
                    s.setUserId(userId);
                    s.setHourlyRate(defaultBase);
                    s.setOvertimeHourlyRate(defaultBase * 1.25);
                    s.setShabatHourlyRate(defaultBase * 1.50);
                    s.setPremiumExpiresAt(LocalDateTime.now().plusDays(7));
                    return userSettingsRepository.save(s);
                });

        // Also handle case where settings exist but are 0.0 (legacy) - fallback to
        // default
        Double currentRate = (settings.getHourlyRate() != null && settings.getHourlyRate() > 0)
                ? settings.getHourlyRate()
                : defaultBase;

        Double currentOvertime = (settings.getOvertimeHourlyRate() != null && settings.getOvertimeHourlyRate() > 0)
                ? settings.getOvertimeHourlyRate()
                : (currentRate * 1.25);

        Double currentShabat = (settings.getShabatHourlyRate() != null && settings.getShabatHourlyRate() > 0)
                ? settings.getShabatHourlyRate()
                : (currentRate * 1.50);

        response.put("hourlyRate", currentRate);
        response.put("overtimeHourlyRate", currentOvertime);
        response.put("shabatHourlyRate", currentShabat);
        response.put("isPremium", settings.getIsPremium());
        response.put("premiumExpiresAt", settings.getPremiumExpiresAt());
        response.put("themePreference",
                settings.getThemePreference() != null ? settings.getThemePreference() : "default");
        return response;
    }

    @PostMapping("/settings")
    public Map<String, Object> updateSettings(
            @AuthenticationPrincipal OAuth2User principal,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> response = new HashMap<>();
        if (principal == null) {
            response.put("hourlyRate", 0);
            response.put("overtimeHourlyRate", 0);
            response.put("shabatHourlyRate", 0);
            response.put("themePreference", "default");
            return response;
        }
        String userId = principal.getName();

        Double hourlyRate = null;
        Object value = body.get("hourlyRate");
        if (value instanceof Number number) {
            hourlyRate = number.doubleValue();
        }
        if (hourlyRate == null) {
            hourlyRate = 0.0;
        }

        Double overtimeHourlyRate = null;
        Object overtimeValue = body.get("overtimeHourlyRate");
        if (overtimeValue instanceof Number number) {
            overtimeHourlyRate = number.doubleValue();
        }
        if (overtimeHourlyRate == null) {
            overtimeHourlyRate = 63.75;
        }

        Double shabatHourlyRate = null;
        Object shabatValue = body.get("shabatHourlyRate");
        if (shabatValue instanceof Number number) {
            shabatHourlyRate = number.doubleValue();
        }
        if (shabatHourlyRate == null) {
            shabatHourlyRate = 76.5; // 51 * 1.5
        }

        // Handle theme preference
        String themePreference = (String) body.get("themePreference");
        if (themePreference == null || themePreference.trim().isEmpty()) {
            themePreference = "default";
        }

        UserSettings settings = userSettingsRepository
                .findByUserId(userId)
                .orElseGet(() -> {
                    UserSettings s = new UserSettings();
                    s.setUserId(userId);
                    // s.setIsPremium(true);
                    return s;
                });
        settings.setHourlyRate(hourlyRate);
        settings.setOvertimeHourlyRate(overtimeHourlyRate);
        settings.setShabatHourlyRate(shabatHourlyRate);
        settings.setThemePreference(themePreference);
        userSettingsRepository.save(settings);

        response.put("hourlyRate", settings.getHourlyRate());
        response.put("overtimeHourlyRate", settings.getOvertimeHourlyRate());
        response.put("shabatHourlyRate", settings.getShabatHourlyRate());
        response.put("themePreference", settings.getThemePreference());
        return response;
    }

    @PostMapping("/settings/add-premium")
    public Map<String, Object> addPremiumDays(
            @AuthenticationPrincipal OAuth2User principal,
            @RequestBody Map<String, Object> body) {

        Map<String, Object> response = new HashMap<>();
        if (principal == null)
            return response;

        String userId = principal.getName();
        Integer daysToAdd = (Integer) body.get("days");
        if (daysToAdd == null || daysToAdd <= 0) {
            daysToAdd = 30; // default
        }

        UserSettings settings = userSettingsRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserSettings s = new UserSettings();
                    s.setUserId(userId);
                    s.setHourlyRate(51.0);
                    return userSettingsRepository.save(s);
                });

        java.time.LocalDateTime currentExpiry = settings.getPremiumExpiresAt();
        java.time.LocalDateTime now = java.time.LocalDateTime.now();

        if (currentExpiry == null || currentExpiry.isBefore(now)) {
            settings.setPremiumExpiresAt(now.plusDays(daysToAdd));
        } else {
            settings.setPremiumExpiresAt(currentExpiry.plusDays(daysToAdd));
        }

        userSettingsRepository.save(settings);

        response.put("isPremium", settings.getIsPremium());
        response.put("premiumExpiresAt", settings.getPremiumExpiresAt());
        return response;
    }

    @PostMapping("/me/display-name")
    public Map<String, Object> updateDisplayName(
            @AuthenticationPrincipal OAuth2User principal,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> response = new HashMap<>();
        if (principal == null) {
            response.put("displayName", "אורח");
            return response;
        }
        String externalId = principal.getName();
        String newName = (String) body.get("displayName");
        if (newName == null || newName.trim().isEmpty()) {
            response.put("displayName", "אורח");
            return response;
        }

        User user = userRepository
                .findByExternalId(externalId)
                .orElse(null);
        if (user == null) {
            response.put("displayName", "אורח");
            return response;
        }

        user.setDisplayName(newName.trim());
        userRepository.save(user);

        response.put("displayName", user.getDisplayName());
        return response;
    }

    @GetMapping("/history")
    public Map<String, Object> history(
            @AuthenticationPrincipal OAuth2User principal,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        Map<String, Object> response = new HashMap<>();
        if (principal == null) {
            response.put("items", List.of());
            return response;
        }
        String userId = principal.getName();

        List<Shift> shifts;
        if (year != null && month != null) {
            YearMonth ym = YearMonth.of(year, month);
            LocalDate start = ym.atDay(1);
            LocalDate end = ym.atEndOfMonth();
            shifts = shiftRepository.findByUserIdAndDateBetweenOrderByDateDesc(userId, start, end);
        } else {
            shifts = shiftRepository.findAllByUserIdOrderByDateDesc(userId);
        }

        List<Map<String, Object>> items = shifts.stream()
                .map(s -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", s.getId());
                    m.put("date", s.getDate());
                    m.put("startTime", s.getStartTime());
                    m.put("endTime", s.getEndTime());
                    m.put("shiftType", s.getShiftType());
                    m.put("hours", s.getHours());
                    m.put("salary", s.getSalary());
                    m.put("overtimeHours", s.getOvertimeHours());
                    m.put("overtimeSalary", s.getOvertimeSalary());
                    m.put("tipAmount", s.getTipAmount());
                    return m;
                })
                .toList();

        response.put("items", items);
        return response;
    }
}
