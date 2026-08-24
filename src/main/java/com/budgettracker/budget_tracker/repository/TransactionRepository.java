package com.budgettracker.budget_tracker.repository;

import com.budgettracker.budget_tracker.entity.Transaction;
import com.budgettracker.budget_tracker.entity.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUserId(Long userId);

    List<Transaction> findByUserIdAndType(
            Long userId,
            TransactionType type
    );

    List<Transaction> findByUserIdAndDateBetween(
            Long userId,
            LocalDate startDate,
            LocalDate endDate
    );

    List<Transaction> findByUserIdAndCategoryId(
            Long userId,
            Long categoryId
    );
}