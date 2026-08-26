package com.budgettracker.budget_tracker.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class ReportDataResponse {

    private String label;

    private BigDecimal totalIncome;

    private BigDecimal totalExpense;
}