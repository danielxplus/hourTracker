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

    @GetMapping
    public List<Workplace> getUserWorkplaces(@AuthenticationPrincipal OAuth2User principal) {
        if (principal == null)
            return List.of();

        String userId = principal.getName();
        List<Workplace> workplaces = workplaceRepository.findByUserId(userId);

        if (workplaces.isEmpty()) {
            // Migration for legacy users: Create default workplace and assign existing
            // shifts
            Workplace defaultWp = new Workplace();
            defaultWp.setUserId(userId);
            defaultWp.setName("ברירת מחדל");
            defaultWp.setColor("#3B82F6"); // Blue
            defaultWp.setDefault(true);
            // Default rates
            defaultWp.setHourlyRate(50.0);
            defaultWp.setOvertimeHourlyRate(62.5);
            defaultWp.setShabatHourlyRate(75.0);

            defaultWp = workplaceRepository.save(defaultWp);

            // Migrate existing shifts
            shiftRepository.updateWorkplaceIdForUser(userId, defaultWp.getId());

            return List.of(defaultWp);
        }

        return workplaces;
    }

    @PostMapping
    public Workplace createWorkplace(@AuthenticationPrincipal OAuth2User principal, @RequestBody Workplace workplace) {
        if (principal == null)
            throw new IllegalStateException("Unauthorized");
        String userId = principal.getName();
        workplace.setUserId(userId);

        if (workplace.isDefault()) {
            unsetOtherDefaults(userId);
        } else {
            // If this is the FIRST/ONLY workplace, force it to be default
            List<Workplace> existing = workplaceRepository.findByUserId(userId);
            if (existing.isEmpty()) {
                workplace.setDefault(true);
            }
        }
        return workplaceRepository.save(workplace);
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
                    w.setName(updates.getName());
                    w.setHourlyRate(updates.getHourlyRate());
                    w.setOvertimeHourlyRate(updates.getOvertimeHourlyRate());
                    w.setShabatHourlyRate(updates.getShabatHourlyRate());
                    w.setColor(updates.getColor());

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
