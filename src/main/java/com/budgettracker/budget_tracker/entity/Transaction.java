package com.budgettracker.budget_tracker.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionType type;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private LocalDate date;

    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "counterparty_id")
    private Counterparty counterparty;

    @Column(length = 80)
    private String documentNumber;

    @Column(length = 100)
    private String department;

    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.PAID;

    @Column(nullable = false)
    @Builder.Default
    private boolean cancelled = false;

    @Column(length = 500)
    private String cancellationReason;

    @Version
    @Builder.Default
    private Long version = 0L;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private java.time.Instant createdAt = java.time.Instant.now();

    @Column(nullable = false)
    @Builder.Default
    private java.time.Instant updatedAt = java.time.Instant.now();

    @Column(length = 255)
    private String updatedBy;
}
