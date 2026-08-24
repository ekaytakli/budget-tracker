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

        return TransactionResponse.builder()
                .id(savedTransaction.getId())
                .type(savedTransaction.getType())
                .amount(savedTransaction.getAmount())
                .date(savedTransaction.getDate())
                .description(savedTransaction.getDescription())
                .categoryId(savedTransaction.getCategory().getId())
                .categoryName(savedTransaction.getCategory().getName())
                .build();
    }
}