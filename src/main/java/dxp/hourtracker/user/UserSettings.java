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
     * The date and time when the premium status expires.
     * If null or strictly before now, the user is not premium.
     */
    @Column(name = "premium_expires_at")
    private java.time.LocalDateTime premiumExpiresAt;

    /**
     * flag for premium users (deprecated in favor of premiumExpiresAt, but kept for
     * compatibility logic/transient)
     * We'll remove the field from DB mapping basically or just use a transient
     * getter.
     * Actually, let's replace the field entirely as planned.
     */
    @Transient // This ensures it's not mapped to the DB anymore, or we can just remove the
               // field.
    public boolean getIsPremium() {
        return premiumExpiresAt != null && premiumExpiresAt.isAfter(java.time.LocalDateTime.now());
    }

    public void setIsPremium(boolean isPremium) {
        // Compatibility setter: if true, give some default time? Or just ignore?
        // For migration/init purposes, if we set isPremium=true, let's give them a far
        // future date or default 30 days?
        // Let's safe-guard: if setting true and we don't have an expiry, set it to
        // forever or a default.
        // But better to force usage of correct API.
        if (isPremium) {
            if (this.premiumExpiresAt == null || this.premiumExpiresAt.isBefore(java.time.LocalDateTime.now())) {
                // default to 30 days if somehow setting boolean true manually
                this.premiumExpiresAt = java.time.LocalDateTime.now().plusDays(30);
            }
        } else {
            this.premiumExpiresAt = null;
        }
    }

    /**
     * Theme preference: "default", "light", "dark", "pitch-black"
     */
    @Builder.Default
    @Column(name = "theme_preference")
    private String themePreference = "default";
}
