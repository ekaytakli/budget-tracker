package com.budgettracker.budget_tracker.dto;

import com.budgettracker.budget_tracker.entity.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;

public final class CompanyDtos {
    private CompanyDtos() {}

    public record EntryRequest(
        @NotNull TransactionType type,
        @NotNull @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal amount,
        @NotNull LocalDate date,
        @Size(max = 1000) String description,
        @NotNull Long categoryId,
        Long counterpartyId,
        @Size(max = 80) String documentNumber,
        @Size(max = 100) String department,
        LocalDate dueDate,
        @NotNull PaymentStatus paymentStatus,
        @PositiveOrZero Long version
    ) {}

    public record EntryView(Long id, TransactionType type, BigDecimal amount, LocalDate date,
        String description, Long categoryId, String categoryName, Long counterpartyId,
        String counterpartyName, String documentNumber, String department, LocalDate dueDate,
        PaymentStatus paymentStatus, boolean cancelled, String cancellationReason, Long version,
        String createdBy, Instant createdAt, String updatedBy, Instant updatedAt) {}

    public record CancelRequest(@NotBlank @Size(max = 500) String reason, @NotNull Long version) {}
    public record CategoryRequest(@NotBlank @Size(max = 100) String name, @NotNull TransactionType type) {}
    public record PartyRequest(@NotBlank @Size(max = 200) String name,
        @Pattern(regexp = "^$|[0-9]{10,11}", message = "Vergi/T.C. numarası 10 veya 11 rakam olmalıdır") String taxNumber,
        @Email @Size(max = 200) String email, @Size(max = 30) String phone,
        @NotNull @Pattern(regexp = "CUSTOMER|SUPPLIER|BOTH") String kind) {}
    public record PartyView(Long id, String name, String taxNumber, String email, String phone,
        String kind, BigDecimal receivable, BigDecimal payable) {}
    public record Summary(BigDecimal income, BigDecimal expense, BigDecimal net,
        BigDecimal received, BigDecimal paid, BigDecimal cashBalance,
        BigDecimal receivable, BigDecimal payable, BigDecimal overdue, long count) {}
    public record PageResult<T>(List<T> content, long totalElements, int totalPages, int number, int size) {}
    public record RoleRequest(@NotNull UserRole role, Boolean active) {}
    public record PasswordRequest(@NotBlank String currentPassword,
        @NotBlank @Size(min = 12, max = 72) String newPassword) {}
    public record PeriodReport(String period, BigDecimal income, BigDecimal expense,
        BigDecimal received, BigDecimal paid) {}
}
