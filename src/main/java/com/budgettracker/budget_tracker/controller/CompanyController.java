package com.budgettracker.budget_tracker.controller;

import com.budgettracker.budget_tracker.dto.CompanyDtos.*;
import com.budgettracker.budget_tracker.entity.*;
import com.budgettracker.budget_tracker.repository.CategoryRepository;
import com.budgettracker.budget_tracker.service.CompanyLedgerService;
import com.budgettracker.budget_tracker.service.CompanyLedgerService.Filters;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.time.LocalDate;
import java.util.List;

@RestController @RequestMapping("/api/company") @RequiredArgsConstructor
public class CompanyController {
    private final CompanyLedgerService ledger;
    private final CategoryRepository categories;

    // Spring binds query parameters into this record using its canonical constructor.
    public record Query(LocalDate start, LocalDate end, TransactionType type, Long categoryId,
        Long counterpartyId, PaymentStatus status, String q, Boolean includeCancelled) {
        public Filters filters() { return new Filters(start,end,type,categoryId,counterpartyId,status,q,Boolean.TRUE.equals(includeCancelled)); }
    }

    @GetMapping("/transactions")
    public PageResult<EntryView> list(@ModelAttribute Query query,@RequestParam(defaultValue="0") int page,
        @RequestParam(defaultValue="30") int size) { return ledger.list(query.filters(),page,size); }
    @GetMapping("/summary")
    public Summary summary(@ModelAttribute Query query) { return ledger.summary(query.filters()); }
    @GetMapping("/reports")
    public List<PeriodReport> reports(@ModelAttribute Query query) { return ledger.reports(query.filters()); }
    @GetMapping("/export")
    public ResponseEntity<String> export(@ModelAttribute Query query) {
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=hesap-kayitlari.csv")
            .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8")).body(ledger.export(query.filters()));
    }
    @PostMapping("/transactions") @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public EntryView create(@Valid @RequestBody EntryRequest request,Principal p) { return ledger.create(request,p.getName()); }
    @PutMapping("/transactions/{id}") @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public EntryView update(@PathVariable Long id,@Valid @RequestBody EntryRequest request,Principal p) { return ledger.update(id,request,p.getName()); }
    @PostMapping("/transactions/{id}/cancel") @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public void cancel(@PathVariable Long id,@Valid @RequestBody CancelRequest request,Principal p) { ledger.cancel(id,request,p.getName()); }
    @GetMapping("/categories")
    public List<Category> categories() { return categories.findAll(org.springframework.data.domain.Sort.by("name")); }
    @PostMapping("/categories") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public Category category(@Valid @RequestBody CategoryRequest request,Principal p) { return ledger.createCategory(request,p.getName()); }
    @GetMapping("/counterparties")
    public List<PartyView> parties() { return ledger.parties(); }
    @PostMapping("/counterparties") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public Counterparty party(@Valid @RequestBody PartyRequest request,Principal p) { return ledger.createParty(request,p.getName()); }
    @GetMapping("/audit") @PreAuthorize("hasRole('ADMIN')")
    public PageResult<AuditEntry> audit(@RequestParam(defaultValue="0") int page) { return ledger.auditPage(page); }
}
