package com.budgettracker.budget_tracker.dto;

import com.budgettracker.budget_tracker.entity.TransactionType;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Builder
public class TransactionResponse {

    private Long id;

    private TransactionType type;

    private BigDecimal amount;

    private LocalDate date;

    private String description;

    private Long categoryId;

    private String categoryName;
}