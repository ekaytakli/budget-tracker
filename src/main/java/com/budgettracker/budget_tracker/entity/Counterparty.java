package com.budgettracker.budget_tracker.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "counterparties")
@Getter @Setter @NoArgsConstructor
public class Counterparty {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 200)
    private String name;
    @Column(length = 20)
    private String taxNumber;
    @Column(length = 200)
    private String email;
    @Column(length = 30)
    private String phone;
    @Column(nullable = false, length = 20)
    private String kind;
}
