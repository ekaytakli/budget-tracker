package com.budgettracker.budget_tracker.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "audit_entries")
@Getter @Setter @NoArgsConstructor
public class AuditEntry {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Instant occurredAt = Instant.now();
    @Column(nullable = false)
    private String actor;
    @Column(nullable = false)
    private String action;
    @Column(nullable = false)
    private String entityType;
    private Long entityId;
    @Column(columnDefinition = "text")
    private String beforeValue;
    @Column(columnDefinition = "text")
    private String afterValue;
}
