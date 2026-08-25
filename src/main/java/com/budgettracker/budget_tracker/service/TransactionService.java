package com.budgettracker.budget_tracker.service;

import com.budgettracker.budget_tracker.dto.TransactionRequest;
import com.budgettracker.budget_tracker.dto.TransactionResponse;
import com.budgettracker.budget_tracker.entity.Category;
import com.budgettracker.budget_tracker.entity.Transaction;
import com.budgettracker.budget_tracker.entity.User;
import com.budgettracker.budget_tracker.repository.CategoryRepository;
import com.budgettracker.budget_tracker.repository.TransactionRepository;
import com.budgettracker.budget_tracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    public TransactionResponse createTransaction(
            TransactionRequest request,
            Long userId
    ) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found"));

        Transaction transaction = Transaction.builder()
                .type(request.getType())
                .amount(request.getAmount())
                .date(request.getDate())
                .description(request.getDescription())
                .user(user)
                .category(category)
                .build();

        Transaction savedTransaction =
                transactionRepository.save(transaction);

        return mapToResponse(savedTransaction);
    }

    public List<TransactionResponse> getTransactionsByUser(Long userId) {

        return transactionRepository.findByUserId(userId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public TransactionResponse updateTransaction(
            Long transactionId,
            TransactionRequest request,
            Long userId
    ) {

        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        if (!transaction.getUser().getId().equals(userId)) {
            throw new RuntimeException(
                    "You are not allowed to update this transaction"
            );
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found"));

        transaction.setType(request.getType());
        transaction.setAmount(request.getAmount());
        transaction.setDate(request.getDate());
        transaction.setDescription(request.getDescription());
        transaction.setCategory(category);

        Transaction updatedTransaction =
                transactionRepository.save(transaction);

        return mapToResponse(updatedTransaction);
    }

    public void deleteTransaction(
            Long transactionId,
            Long userId
    ) {

        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        if (!transaction.getUser().getId().equals(userId)) {
            throw new RuntimeException(
                    "You are not allowed to delete this transaction"
            );
        }

        transactionRepository.delete(transaction);
    }

    public List<TransactionResponse> getTransactionsByCategory(
            Long userId,
            Long categoryId
    ) {

        return transactionRepository
                .findByUserIdAndCategoryId(userId, categoryId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<TransactionResponse> getTransactionsByDateRange(
            Long userId,
            LocalDate startDate,
            LocalDate endDate
    ) {

        return transactionRepository
                .findByUserIdAndDateBetween(
                        userId,
                        startDate,
                        endDate
                )
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    private TransactionResponse mapToResponse(
            Transaction transaction
    ) {

        return TransactionResponse.builder()
                .id(transaction.getId())
                .type(transaction.getType())
                .amount(transaction.getAmount())
                .date(transaction.getDate())
                .description(transaction.getDescription())
                .categoryId(transaction.getCategory().getId())
                .categoryName(transaction.getCategory().getName())
                .build();
    }
}