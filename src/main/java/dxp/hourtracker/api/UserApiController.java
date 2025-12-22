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
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.YearMonth;
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
        return response;
    }

    @GetMapping("/summary")
    public Map<String, Object> summary(@AuthenticationPrincipal OAuth2User principal) {
        try{
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

            YearMonth thisMonth = YearMonth.now();
            LocalDate startOfMonth = thisMonth.atDay(1);
            LocalDate endOfMonth = thisMonth.atEndOfMonth();

            List<Shift> monthShifts = shiftRepository.findByUserIdAndDateBetweenOrderByDateDesc(
                    userId, startOfMonth, endOfMonth);

            double monthHours = monthShifts.stream()
                    .mapToDouble(s -> (s.getHours() != null ? s.getHours() : 0.0))
                    .sum();

            LocalDate weekAgo = LocalDate.now().minusDays(7);
            List<Shift> weekShifts = shiftRepository.findByUserIdAndDateBetweenOrderByDateDesc(
                    userId, weekAgo, LocalDate.now());

            double weekHours = weekShifts.stream()
                    .mapToDouble(s -> (s.getHours() != null ? s.getHours() : 0.0))
                    .sum();

            double hourlyRate = settings.getHourlyRate() != null ? settings.getHourlyRate() : 0.0;
            double expectedSalary = monthShifts.stream()
                    .mapToDouble(s -> (s.getSalary() != null ? s.getSalary() : 0.0))
                    .sum();

            double totalTips = monthShifts.stream()
                    .mapToDouble(s -> s.getTipAmount() != null ? s.getTipAmount() : 0.0)
                    .sum();


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
            return response;
        }
        String userId = principal.getName();
        UserSettings settings = userSettingsRepository
                .findByUserId(userId)
                .orElseGet(() -> {
                    UserSettings s = new UserSettings();
                    s.setUserId(userId);
                    s.setHourlyRate(0.0);
                    s.setOvertimeHourlyRate(0.0);
                    return userSettingsRepository.save(s);
                });

        response.put("hourlyRate", settings.getHourlyRate() != null ? settings.getHourlyRate() : 0.0);
        response.put("overtimeHourlyRate", settings.getOvertimeHourlyRate() != null ? settings.getOvertimeHourlyRate() : 0.0);
        return response;
    }

    @PostMapping("/settings")
    public Map<String, Object> updateSettings(
            @AuthenticationPrincipal OAuth2User principal,
            @RequestBody Map<String, Object> body
    ) {
        Map<String, Object> response = new HashMap<>();
        if (principal == null) {
            response.put("hourlyRate", 0);
            response.put("overtimeHourlyRate", 0);
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
            overtimeHourlyRate = 0.0;
        }

        UserSettings settings = userSettingsRepository
                .findByUserId(userId)
                .orElseGet(() -> {
                    UserSettings s = new UserSettings();
                    s.setUserId(userId);
                    return s;
                });
        settings.setHourlyRate(hourlyRate);
        settings.setOvertimeHourlyRate(overtimeHourlyRate);
        userSettingsRepository.save(settings);

        response.put("hourlyRate", settings.getHourlyRate());
        response.put("overtimeHourlyRate", settings.getOvertimeHourlyRate());
        return response;
    }

    @PostMapping("/me/display-name")
    public Map<String, Object> updateDisplayName(
            @AuthenticationPrincipal OAuth2User principal,
            @RequestBody Map<String, Object> body
    ) {
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
    public Map<String, Object> history(@AuthenticationPrincipal OAuth2User principal) {
        Map<String, Object> response = new HashMap<>();
        if (principal == null) {
            response.put("items", List.of());
            return response;
        }
        String userId = principal.getName();
        YearMonth thisMonth = YearMonth.now();
        LocalDate first = thisMonth.atDay(1);
        LocalDate last = thisMonth.atEndOfMonth();

        List<Map<String, Object>> items = shiftRepository
                .findByUserIdAndDateBetweenOrderByDateDesc(userId, first, last)
                .stream()
                .map(s -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", s.getId());
                    m.put("date", s.getDate());
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


