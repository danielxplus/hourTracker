package dxp.hourtracker.user;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_settings", uniqueConstraints = @UniqueConstraint(columnNames = "userId"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String userId;

    private Double hourlyRate;

    private Double overtimeHourlyRate;

    private Double shabatHourlyRate;

    /**
     * flag for premium users
     */
    @Column(columnDefinition = "bit(1) default b'0'")
    private Boolean isPremium = false;
}
