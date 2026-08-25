package com.budgettracker.budget_tracker.controller;

import com.budgettracker.budget_tracker.dto.TransactionRequest;
import com.budgettracker.budget_tracker.dto.TransactionResponse;
import com.budgettracker.budget_tracker.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
            @RequestParam Long userId
    ) {

        TransactionResponse response =
                transactionService.createTransaction(request, userId);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping
    public ResponseEntity<List<TransactionResponse>> getTransactions(
            @RequestParam Long userId
    ) {

        List<TransactionResponse> transactions =
                transactionService.getTransactionsByUser(userId);

        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<List<TransactionResponse>> getTransactionsByCategory(
            @PathVariable Long categoryId,
            @RequestParam Long userId
    ) {

        List<TransactionResponse> transactions =
                transactionService.getTransactionsByCategory(
                        userId,
                        categoryId
                );

        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/date-range")
    public ResponseEntity<List<TransactionResponse>> getTransactionsByDateRange(
            @RequestParam Long userId,
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate
    ) {

        List<TransactionResponse> transactions =
                transactionService.getTransactionsByDateRange(
                        userId,
                        startDate,
                        endDate
                );

        return ResponseEntity.ok(transactions);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TransactionResponse> updateTransaction(
            @PathVariable Long id,
            @Valid @RequestBody TransactionRequest request,
            @RequestParam Long userId
    ) {

        TransactionResponse response =
                transactionService.updateTransaction(
                        id,
                        request,
                        userId
                );

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransaction(
            @PathVariable Long id,
            @RequestParam Long userId
    ) {

        transactionService.deleteTransaction(id, userId);

        return ResponseEntity.noContent().build();
    }
}