package dxp.hourtracker.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import dxp.hourtracker.entity.ShiftType;
import dxp.hourtracker.repository.ShiftTypeRepository;
import dxp.hourtracker.workplace.Workplace;
import dxp.hourtracker.workplace.WorkplaceRepository;
import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkplaceTemplateService {

    private final WorkplaceRepository workplaceRepository;
    private final ShiftTypeRepository shiftTypeRepository;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;

    private List<WorkplaceTemplate> templates = new ArrayList<>();

    @PostConstruct
    public void loadTemplates() {
        try {
            Resource resource = resourceLoader.getResource("classpath:workplaces.json");
            templates = objectMapper.readValue(resource.getInputStream(), new TypeReference<List<WorkplaceTemplate>>() {
            });
            log.info("Loaded {} workplace templates from JSON", templates.size());
        } catch (IOException e) {
            log.error("Failed to load workplace templates", e);
        }
    }

    public List<WorkplaceTemplate> getTemplates() {
        return templates;
    }

    public Optional<WorkplaceTemplate> getTemplateById(String id) {
        return templates.stream().filter(t -> t.getId().equals(id)).findFirst();
    }

    @Transactional
    public Workplace assignTemplateToUser(String userId, String templateId) {
        WorkplaceTemplate template = getTemplateById(templateId)
                .orElseThrow(() -> new IllegalArgumentException("Template not found: " + templateId));

        // Create the workplace instance
        Workplace workplace = Workplace.builder()
                .userId(userId)
                .name(template.getNameHe() != null ? template.getNameHe() : template.getName())
                .hourlyRate(template.getHourlyRate())
                .overtimeHourlyRate(template.getOvertimeHourlyRate())
                .shabatHourlyRate(template.getShabatHourlyRate())
                .shabbatStartHour(template.getShabbatStartHour() != null ? template.getShabbatStartHour() : 15)
                .shabbatEndHour(template.getShabbatEndHour() != null ? template.getShabbatEndHour() : 5)
                .color(template.getColor())
                .templateId(template.getId())
                .isLocked(true) // Fixed workplaces are locked
                .isDefault(false)
                .build();

        // If it's the only one, make it default
        if (workplaceRepository.findByUserId(userId).isEmpty()) {
            workplace.setDefault(true);
        }

        workplace = workplaceRepository.save(workplace);

        // Clone shift types
        for (ShiftTypeTemplate stt : template.getShifts()) {
            ShiftType shiftType = ShiftType.builder()
                    .code(stt.getCode())
                    .workplaceId(workplace.getId())
                    .nameHe(stt.getNameHe())
                    .defaultStart(LocalTime.parse(stt.getDefaultStart()))
                    .defaultEnd(LocalTime.parse(stt.getDefaultEnd()))
                    .defaultHours(stt.getDefaultHours())
                    .unpaidBreakMinutes(stt.getUnpaidBreakMinutes())
                    .sortOrder(stt.getSortOrder())
                    .build();
            shiftTypeRepository.save(shiftType);
        }

        return workplace;
    }

    @Data
    public static class WorkplaceTemplate {
        private String id;
        private String name;
        private String nameHe;
        private Double hourlyRate;
        private Double overtimeHourlyRate;
        private Double shabatHourlyRate;
        private Integer shabbatStartHour;
        private Integer shabbatEndHour;
        private String color;
        private List<ShiftTypeTemplate> shifts;
    }

    @Data
    public static class ShiftTypeTemplate {
        private String code;
        private String nameHe;
        private String defaultStart;
        private String defaultEnd;
        private Double defaultHours;
        private Integer unpaidBreakMinutes;
        private Integer sortOrder;
    }
}
