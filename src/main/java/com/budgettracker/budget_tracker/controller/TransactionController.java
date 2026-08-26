package com.budgettracker.budget_tracker.controller;

import com.budgettracker.budget_tracker.dto.BudgetSummaryResponse;
import com.budgettracker.budget_tracker.dto.ReportDataResponse;
import com.budgettracker.budget_tracker.dto.TransactionRequest;
import com.budgettracker.budget_tracker.dto.TransactionResponse;
import com.budgettracker.budget_tracker.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @PostMapping
    public ResponseEntity<TransactionResponse> createTransaction(
            @Valid @RequestBody TransactionRequest request,
            Principal principal
    ) {

        TransactionResponse response =
                transactionService.createTransaction(
                        request,
                        principal.getName()
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping
    public ResponseEntity<List<TransactionResponse>> getTransactions(
            Principal principal
    ) {

        List<TransactionResponse> transactions =
                transactionService.getTransactionsByUser(
                        principal.getName()
                );

        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<List<TransactionResponse>> getTransactionsByCategory(
            @PathVariable Long categoryId,
            Principal principal
    ) {

        List<TransactionResponse> transactions =
                transactionService.getTransactionsByCategory(
                        principal.getName(),
                        categoryId
                );

        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/date-range")
    public ResponseEntity<List<TransactionResponse>> getTransactionsByDateRange(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate,
            Principal principal
    ) {

        List<TransactionResponse> transactions =
                transactionService.getTransactionsByDateRange(
                        principal.getName(),
                        startDate,
                        endDate
                );

        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/summary")
    public ResponseEntity<BudgetSummaryResponse> getBudgetSummary(
            Principal principal
    ) {

        BudgetSummaryResponse summary =
                transactionService.getBudgetSummary(
                        principal.getName()
                );

        return ResponseEntity.ok(summary);
    }

    @GetMapping("/reports/daily")
    public ResponseEntity<List<ReportDataResponse>> getDailyReport(
            Principal principal
    ) {

        List<ReportDataResponse> report =
                transactionService.getDailyReport(
                        principal.getName()
                );

        return ResponseEntity.ok(report);
    }

    @GetMapping("/reports/weekly")
    public ResponseEntity<List<ReportDataResponse>> getWeeklyReport(
            Principal principal
    ) {

        List<ReportDataResponse> report =
                transactionService.getWeeklyReport(
                        principal.getName()
                );

        return ResponseEntity.ok(report);
    }

    @GetMapping("/reports/monthly")
    public ResponseEntity<List<ReportDataResponse>> getMonthlyReport(
            Principal principal
    ) {

        List<ReportDataResponse> report =
                transactionService.getMonthlyReport(
                        principal.getName()
                );

        return ResponseEntity.ok(report);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TransactionResponse> updateTransaction(
            @PathVariable Long id,
            @Valid @RequestBody TransactionRequest request,
            Principal principal
    ) {

        TransactionResponse response =
                transactionService.updateTransaction(
                        id,
                        request,
                        principal.getName()
                );

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransaction(
            @PathVariable Long id,
            Principal principal
    ) {

        transactionService.deleteTransaction(
                id,
                principal.getName()
        );

        return ResponseEntity.noContent().build();
    }
}