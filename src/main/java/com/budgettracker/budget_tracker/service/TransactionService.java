package com.budgettracker.budget_tracker.service;

import com.budgettracker.budget_tracker.dto.BudgetSummaryResponse;
import com.budgettracker.budget_tracker.dto.ReportDataResponse;
import com.budgettracker.budget_tracker.dto.TransactionRequest;
import com.budgettracker.budget_tracker.dto.TransactionResponse;
import com.budgettracker.budget_tracker.entity.Category;
import com.budgettracker.budget_tracker.entity.Transaction;
import com.budgettracker.budget_tracker.entity.TransactionType;
import com.budgettracker.budget_tracker.entity.User;
import com.budgettracker.budget_tracker.exception.ForbiddenException;
import com.budgettracker.budget_tracker.exception.ResourceNotFoundException;
import com.budgettracker.budget_tracker.repository.CategoryRepository;
import com.budgettracker.budget_tracker.repository.TransactionRepository;
import com.budgettracker.budget_tracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    public TransactionResponse createTransaction(
            TransactionRequest request,
            String username
    ) {

        User user = getCurrentUser(username);

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Category not found"));

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

    public List<TransactionResponse> getTransactionsByUser(
            String username
    ) {

        User user = getCurrentUser(username);

        return transactionRepository.findByUserId(user.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public TransactionResponse updateTransaction(
            Long transactionId,
            TransactionRequest request,
            String username
    ) {

        User user = getCurrentUser(username);

        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Transaction not found"));

        if (!transaction.getUser().getId().equals(user.getId())) {
            throw new ForbiddenException(
                    "You are not allowed to update this transaction"
            );
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Category not found"));

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
            String username
    ) {

        User user = getCurrentUser(username);

        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Transaction not found"));

        if (!transaction.getUser().getId().equals(user.getId())) {
            throw new ForbiddenException(
                    "You are not allowed to delete this transaction"
            );
        }

        transactionRepository.delete(transaction);
    }

    public List<TransactionResponse> getTransactionsByCategory(
            String username,
            Long categoryId
    ) {

        User user = getCurrentUser(username);

        return transactionRepository
                .findByUserIdAndCategoryId(
                        user.getId(),
                        categoryId
                )
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<TransactionResponse> getTransactionsByDateRange(
            String username,
            LocalDate startDate,
            LocalDate endDate
    ) {

        User user = getCurrentUser(username);

        return transactionRepository
                .findByUserIdAndDateBetween(
                        user.getId(),
                        startDate,
                        endDate
                )
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public BudgetSummaryResponse getBudgetSummary(
            String username
    ) {

        User user = getCurrentUser(username);

        List<Transaction> transactions =
                transactionRepository.findByUserId(user.getId());

        BigDecimal totalIncome = transactions.stream()
                .filter(transaction ->
                        transaction.getType() == TransactionType.INCOME)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalExpense = transactions.stream()
                .filter(transaction ->
                        transaction.getType() == TransactionType.EXPENSE)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal balance =
                totalIncome.subtract(totalExpense);

        return BudgetSummaryResponse.builder()
                .totalIncome(totalIncome)
                .totalExpense(totalExpense)
                .balance(balance)
                .build();
    }

    public List<ReportDataResponse> getDailyReport(
            String username
    ) {

        User user = getCurrentUser(username);

        List<Transaction> transactions =
                transactionRepository.findByUserId(user.getId());

        Map<LocalDate, List<Transaction>> groupedTransactions =
                transactions.stream()
                        .collect(
                                java.util.stream.Collectors.groupingBy(
                                        Transaction::getDate,
                                        TreeMap::new,
                                        java.util.stream.Collectors.toList()
                                )
                        );

        return groupedTransactions.entrySet()
                .stream()
                .map(entry -> createReportResponse(
                        entry.getKey().toString(),
                        entry.getValue()
                ))
                .toList();
    }

    public List<ReportDataResponse> getWeeklyReport(
            String username
    ) {

        User user = getCurrentUser(username);

        List<Transaction> transactions =
                transactionRepository.findByUserId(user.getId());

        Map<LocalDate, List<Transaction>> groupedTransactions =
                transactions.stream()
                        .collect(
                                java.util.stream.Collectors.groupingBy(
                                        transaction ->
                                                transaction.getDate()
                                                        .with(
                                                                TemporalAdjusters
                                                                        .previousOrSame(
                                                                                DayOfWeek.MONDAY
                                                                        )
                                                        ),
                                        TreeMap::new,
                                        java.util.stream.Collectors.toList()
                                )
                        );

        return groupedTransactions.entrySet()
                .stream()
                .map(entry -> createReportResponse(
                        entry.getKey().toString(),
                        entry.getValue()
                ))
                .toList();
    }

    public List<ReportDataResponse> getMonthlyReport(
            String username
    ) {

        User user = getCurrentUser(username);

        List<Transaction> transactions =
                transactionRepository.findByUserId(user.getId());

        Map<YearMonth, List<Transaction>> groupedTransactions =
                transactions.stream()
                        .collect(
                                java.util.stream.Collectors.groupingBy(
                                        transaction ->
                                                YearMonth.from(
                                                        transaction.getDate()
                                                ),
                                        TreeMap::new,
                                        java.util.stream.Collectors.toList()
                                )
                        );

        return groupedTransactions.entrySet()
                .stream()
                .map(entry -> createReportResponse(
                        entry.getKey().toString(),
                        entry.getValue()
                ))
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

    private ReportDataResponse createReportResponse(
            String label,
            List<Transaction> transactions
    ) {

        BigDecimal totalIncome = transactions.stream()
                .filter(transaction ->
                        transaction.getType() == TransactionType.INCOME)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalExpense = transactions.stream()
                .filter(transaction ->
                        transaction.getType() == TransactionType.EXPENSE)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return ReportDataResponse.builder()
                .label(label)
                .totalIncome(totalIncome)
                .totalExpense(totalExpense)
                .build();
    }

    private User getCurrentUser(
            String username
    ) {

        return userRepository.findByUsername(username)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));
    }
}