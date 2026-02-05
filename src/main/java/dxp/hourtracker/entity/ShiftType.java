package dxp.hourtracker.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

@Entity
@Table(name = "shift_types")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Code such as MORNING / EVENING / NIGHT.
     * Unique constraint should likely include workplaceId now, but simpler
     * validation might be better.
     */
    @Column(nullable = false)
    private String code;

    @Column(name = "workplace_id")
    private Long workplaceId;

    /**
     * Display name in Hebrew (e.g. "משמרת בוקר").
     */
    @Column(nullable = false)
    private String nameHe;

    private LocalTime defaultStart;

    private LocalTime defaultEnd;

    /**
     * Default number of hours for the shift.
     */
    private Double defaultHours;

    @Column(name = "unpaid_break_minutes")
    private Integer unpaidBreakMinutes;

    @Builder.Default
    @Column(name = "sort_order")
    private Integer sortOrder = 100;

}
