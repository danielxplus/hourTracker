package dxp.hourtracker.controller;

import dxp.hourtracker.entity.ShiftType;
import dxp.hourtracker.repository.ShiftTypeRepository;
import dxp.hourtracker.service.ShiftService;
import dxp.hourtracker.shift.Shift;
import dxp.hourtracker.shift.ShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ShiftController {

    private final ShiftTypeRepository shiftTypeRepository;
    private final ShiftService shiftService; // Inject Service
    private final ShiftRepository shiftRepository;

    @GetMapping("/shift-types")
    public List<ShiftType> getShiftTypes(@RequestParam(required = false) Long workplaceId) {
        if (workplaceId != null) {
            return shiftTypeRepository.findAllByWorkplaceIdOrderBySortOrderAsc(workplaceId);
        }
        // Fallback for legacy/system defaults
        // return shiftTypeRepository.findAllByWorkplaceIdIsNullOrderBySortOrderAsc();
        // OR return all if strictly needed debugging, but we want separation.
        // Let's return System Defaults (null workplaceId)
        return shiftTypeRepository.findAllByWorkplaceIdIsNullOrderBySortOrderAsc();
    }

    @PostMapping("/shifts")
    public Map<String, Object> createShift(
            @AuthenticationPrincipal OAuth2User principal,
            @RequestBody Map<String, Object> body) {
        if (principal == null) {
            throw new IllegalStateException("User must be authenticated to create shifts");
        }
        // userId is used by service, but variable here only needed if we log or use it
        // String userId = principal.getName();
        // Shift saved = shiftService.createShift(principal.getName(), body);
        Shift saved = shiftService.createShift(principal.getName(), body);
        return toShiftDto(saved);
    }

    @PutMapping("/shifts/{id}")
    public Map<String, Object> updateShift(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        if (principal == null) {
            throw new IllegalStateException("User must be authenticated");
        }
        String userId = principal.getName();
        Shift updated = shiftService.updateShift(id, userId, body);
        return toShiftDto(updated);
    }

    @DeleteMapping("/shifts/{id}")
    public void deleteShift(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable Long id) {
        if (principal == null) {
            throw new IllegalStateException("User must be authenticated");
        }
        // Basic ownership check should ideally be in service or here
        String userId = principal.getName();
        Shift existing = shiftRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Shift not found"));
        if (!existing.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Unauthorized");
        }
        shiftRepository.delete(existing);
    }

    @PostMapping("/shifts/{id}/end")
    public Map<String, Object> endShift(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable Long id) {
        if (principal == null) {
            throw new IllegalStateException("User must be authenticated");
        }
        String userId = principal.getName();
        Shift ended = shiftService.endShift(id, userId);
        return toShiftDto(ended);
    }

    private Map<String, Object> toShiftDto(Shift saved) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", saved.getId());
        response.put("date", saved.getDate());
        response.put("shiftType", saved.getShiftType());
        response.put("hours", saved.getHours());
        response.put("salary", saved.getSalary());
        response.put("overtimeHours", saved.getOvertimeHours());
        response.put("overtimeSalary", saved.getOvertimeSalary());
        response.put("tipAmount", saved.getTipAmount());
        // For frontend "active" logic, we might need start/end time
        response.put("startTime", saved.getStartTime());
        response.put("endTime", saved.getEndTime());
        return response;
    }

    private Map<String, Object> toDto(ShiftType type) {
        Map<String, Object> m = new HashMap<>();
        m.put("code", type.getCode());
        m.put("nameHe", type.getNameHe());
        m.put("defaultStart", type.getDefaultStart());
        m.put("defaultEnd", type.getDefaultEnd());
        m.put("defaultHours", type.getDefaultHours());
        return m;
    }

    @PostMapping("/shifts/{shiftId}/tip")
    public Map<String, Object> addTipToShift(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable Long shiftId,
            @RequestBody Map<String, Object> body) {
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
