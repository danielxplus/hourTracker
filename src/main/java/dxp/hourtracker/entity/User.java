package dxp.hourtracker.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The technical identifier coming from OAuth2 (sub or name).
     */
    @Column(nullable = false, unique = true)
    private String externalId;

    private String displayName;

    private String email;

    /**
     * flag for premium users
     */
    private Boolean isPremium = false;
}
