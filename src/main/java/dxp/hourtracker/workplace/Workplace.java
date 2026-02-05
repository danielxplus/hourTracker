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

    private String color; // Hex code for UI distinction

    @Builder.Default
    private boolean isDefault = false;
}
