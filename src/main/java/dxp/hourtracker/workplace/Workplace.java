package dxp.hourtracker.workplace;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "workplaces")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Workplace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String name;

    private Double hourlyRate;

    private Double overtimeHourlyRate;

    private Double shabatHourlyRate;

    @Builder.Default
    private Integer shabbatStartHour = 15; // Friday 15:00 default

    @Builder.Default
    private Integer shabbatEndHour = 5; // Sunday 05:00 default

    private String color; // Hex code for UI distinction

    private String templateId; // ID from workplaces.json

    @Builder.Default
    private boolean isLocked = false; // If true, shifts/name are non-editable

    @Builder.Default
    private boolean isDefault = false;
}
