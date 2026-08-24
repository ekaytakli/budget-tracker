package com.budgettracker.budget_tracker.repository;

import com.budgettracker.budget_tracker.entity.Category;
import com.budgettracker.budget_tracker.entity.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findByType(TransactionType type);
}