package dxp.hourtracker.workplace;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import dxp.hourtracker.shift.ShiftRepository;

import java.util.List;

@RestController
@RequestMapping("/api/workplaces")
@RequiredArgsConstructor
@Transactional
public class WorkplaceController {

    private final WorkplaceRepository workplaceRepository;
    private final ShiftRepository shiftRepository;
    private final dxp.hourtracker.service.WorkplaceTemplateService templateService;

    @GetMapping("/templates")
    public List<dxp.hourtracker.service.WorkplaceTemplateService.WorkplaceTemplate> getTemplates() {
        return templateService.getTemplates();
    }

    @PostMapping("/select")
    public Workplace selectTemplate(@AuthenticationPrincipal OAuth2User principal, @RequestParam String templateId) {
        if (principal == null)
            throw new IllegalStateException("Unauthorized");
        String userId = principal.getName();
        return templateService.assignTemplateToUser(userId, templateId);
    }

    @GetMapping
    public List<Workplace> getUserWorkplaces(@AuthenticationPrincipal OAuth2User principal) {
        if (principal == null)
            return List.of();

        String userId = principal.getName();
        List<Workplace> workplaces = workplaceRepository.findByUserId(userId);

        if (workplaces.isEmpty()) {
            // New logic: Don't auto-create legacy "Default".
            // Return empty and let frontend prompt selection or create a default if needed?
            // Actually, keep migration/fallback for safety but maybe use a template?
            return List.of();
        }

        return workplaces;
    }

    @PostMapping
    public Workplace createWorkplace(@AuthenticationPrincipal OAuth2User principal, @RequestBody Workplace workplace) {
        if (principal == null)
            throw new IllegalStateException("Unauthorized");

        // Disable custom creation as per requirements
        throw new UnsupportedOperationException("Custom workplace creation is disabled. Use /select instead.");
    }

    @PutMapping("/{id}")
    public ResponseEntity<Workplace> updateWorkplace(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable Long id,
            @RequestBody Workplace updates) {
        if (principal == null)
            return ResponseEntity.status(401).build();
        String userId = principal.getName();

        return workplaceRepository.findById(id)
                .filter(w -> w.getUserId().equals(userId))
                .map(w -> {
                    // Locked workplaces only allow rate updates
                    if (w.isLocked()) {
                        w.setHourlyRate(updates.getHourlyRate());
                        w.setOvertimeHourlyRate(updates.getOvertimeHourlyRate());
                        w.setShabatHourlyRate(updates.getShabatHourlyRate());
                    } else {
                        w.setName(updates.getName());
                        w.setHourlyRate(updates.getHourlyRate());
                        w.setOvertimeHourlyRate(updates.getOvertimeHourlyRate());
                        w.setShabatHourlyRate(updates.getShabatHourlyRate());
                        w.setColor(updates.getColor());
                    }

                    if (updates.isDefault() && !w.isDefault()) {
                        unsetOtherDefaults(userId);
                        w.setDefault(true);
                    } else if (updates.isDefault()) {
                        w.setDefault(true);
                    }

                    return ResponseEntity.ok(workplaceRepository.save(w));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorkplace(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable Long id) {
        if (principal == null)
            return ResponseEntity.status(401).build();
        String userId = principal.getName();

        return workplaceRepository.findById(id)
                .filter(w -> w.getUserId().equals(userId))
                .map(w -> {
                    // Prevent deleting the only workplace if it's the active one?
                    // For now, allow deletion but maybe add a guard later.
                    workplaceRepository.delete(w);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private void unsetOtherDefaults(String userId) {
        List<Workplace> workplaces = workplaceRepository.findByUserId(userId);
        for (Workplace w : workplaces) {
            if (w.isDefault()) {
                w.setDefault(false);
                workplaceRepository.save(w);
            }
        }
    }
}
