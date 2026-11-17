package com.budgettracker.budget_tracker.repository;
import com.budgettracker.budget_tracker.entity.AuditEntry;
import org.springframework.data.jpa.repository.JpaRepository;
public interface AuditRepository extends JpaRepository<AuditEntry, Long> {}
