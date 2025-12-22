package dxp.hourtracker.shift;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "shifts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Shift {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String userId;

    private LocalDate date;

    private LocalTime startTime;

    private LocalTime endTime;

    private String shiftType;

    private Double hours;

    private Double salary;

    /**
     * Optional overtime information.
     */
    private Double overtimeHours;

    /**
     * Hourly rate used for overtime hours.
     */
    private Double overtimeHourlyRate;

    /**
     * Calculated salary component that comes from overtime work.
     */
    private Double overtimeSalary;

    /**
     * Optional tip amount.
     */
    private Double tipAmount;
}
