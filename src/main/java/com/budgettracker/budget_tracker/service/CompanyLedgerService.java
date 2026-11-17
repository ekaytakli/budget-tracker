package com.budgettracker.budget_tracker.service;

import com.budgettracker.budget_tracker.dto.CompanyDtos.*;
import com.budgettracker.budget_tracker.entity.*;
import com.budgettracker.budget_tracker.entity.Transaction;
import com.budgettracker.budget_tracker.exception.*;
import com.budgettracker.budget_tracker.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional(readOnly = true)
public class CompanyLedgerService {
    private final TransactionRepository transactions;
    private final CategoryRepository categories;
    private final CounterpartyRepository parties;
    private final UserRepository users;
    private final AuditRepository audits;
    private final EntityManager em;

    public record Filters(LocalDate start, LocalDate end, TransactionType type, Long categoryId,
        Long counterpartyId, PaymentStatus status, String q, boolean includeCancelled) {}

    public Specification<Transaction> specification(Filters f) {
        if (f.start() != null && f.end() != null && f.start().isAfter(f.end()))
            throw new IllegalArgumentException("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
        return (r, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (!f.includeCancelled()) p.add(cb.isFalse(r.get("cancelled")));
            if (f.start() != null) p.add(cb.greaterThanOrEqualTo(r.get("date"), f.start()));
            if (f.end() != null) p.add(cb.lessThanOrEqualTo(r.get("date"), f.end()));
            if (f.type() != null) p.add(cb.equal(r.get("type"), f.type()));
            if (f.categoryId() != null) p.add(cb.equal(r.get("category").get("id"), f.categoryId()));
            if (f.counterpartyId() != null) p.add(cb.equal(r.get("counterparty").get("id"), f.counterpartyId()));
            if (f.status() != null) p.add(cb.equal(r.get("paymentStatus"), f.status()));
            if (f.q() != null && !f.q().isBlank()) {
                String value = "%" + f.q().trim().toLowerCase(Locale.ROOT)
                    .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
                p.add(cb.or(cb.like(cb.lower(r.get("description")), value, '\\'),
                    cb.like(cb.lower(r.get("documentNumber")), value, '\\'),
                    cb.like(cb.lower(r.get("department")), value, '\\')));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
    }

    public PageResult<EntryView> list(Filters filters, int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw new IllegalArgumentException("Geçersiz sayfa boyutu (1–100).");
        Page<Transaction> result = transactions.findAll(specification(filters),
            PageRequest.of(page, size, Sort.by(Sort.Order.desc("date"), Sort.Order.desc("id"))));
        return new PageResult<>(result.map(this::view).getContent(), result.getTotalElements(),
            result.getTotalPages(), page, size);
    }

    public Summary summary(Filters filters) {
        // Cancelled entries never affect balances, even when displayed in the table.
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Object[]> query = cb.createQuery(Object[].class);
        Root<Transaction> r = query.from(Transaction.class);
        Predicate income = cb.equal(r.get("type"), TransactionType.INCOME);
        Predicate expense = cb.equal(r.get("type"), TransactionType.EXPENSE);
        Predicate paid = cb.equal(r.get("paymentStatus"), PaymentStatus.PAID);
        Predicate pending = cb.equal(r.get("paymentStatus"), PaymentStatus.PENDING);
        Predicate overdue = cb.and(pending, cb.lessThan(r.get("dueDate"), LocalDate.now()));
        query.multiselect(sum(cb,r,income), sum(cb,r,expense), sum(cb,r,cb.and(income,paid)),
            sum(cb,r,cb.and(expense,paid)), sum(cb,r,cb.and(income,pending)),
            sum(cb,r,cb.and(expense,pending)), sum(cb,r,overdue), cb.count(r));
        query.where(cb.and(specification(filters).toPredicate(r, query, cb), cb.isFalse(r.get("cancelled"))));
        Object[] a = em.createQuery(query).getSingleResult();
        BigDecimal in=(BigDecimal)a[0], out=(BigDecimal)a[1], received=(BigDecimal)a[2], paidOut=(BigDecimal)a[3];
        return new Summary(in,out,in.subtract(out),received,paidOut,received.subtract(paidOut),
            (BigDecimal)a[4],(BigDecimal)a[5],(BigDecimal)a[6],(Long)a[7]);
    }

    private Expression<BigDecimal> sum(CriteriaBuilder cb, Root<Transaction> r, Predicate condition) {
        return cb.coalesce(cb.sum(cb.<BigDecimal>selectCase().when(condition,r.<BigDecimal>get("amount"))
            .otherwise(BigDecimal.ZERO)),BigDecimal.ZERO);
    }

    public List<PeriodReport> reports(Filters filters) {
        org.hibernate.query.criteria.HibernateCriteriaBuilder cb=(org.hibernate.query.criteria.HibernateCriteriaBuilder)em.getCriteriaBuilder();
        CriteriaQuery<Object[]> query=cb.createQuery(Object[].class);
        Root<Transaction> r=query.from(Transaction.class);
        Expression<Integer> year=cb.year(r.<LocalDate>get("date"));
        Expression<Integer> month=cb.month(r.<LocalDate>get("date"));
        Predicate income=cb.equal(r.get("type"),TransactionType.INCOME);
        Predicate expense=cb.equal(r.get("type"),TransactionType.EXPENSE);
        Predicate paid=cb.equal(r.get("paymentStatus"),PaymentStatus.PAID);
        query.multiselect(year,month,sum(cb,r,income),sum(cb,r,expense),
            sum(cb,r,cb.and(income,paid)),sum(cb,r,cb.and(expense,paid)));
        query.where(cb.and(specification(filters).toPredicate(r,query,cb),cb.isFalse(r.get("cancelled"))));
        query.groupBy(year,month).orderBy(cb.desc(year),cb.desc(month));
        List<PeriodReport> result=new ArrayList<>();
        for(Object[] row:em.createQuery(query).setMaxResults(24).getResultList())
            result.add(new PeriodReport(String.format(Locale.ROOT,"%04d-%02d",row[0],row[1]),
                (BigDecimal)row[2],(BigDecimal)row[3],(BigDecimal)row[4],(BigDecimal)row[5]));
        Collections.reverse(result);
        return result;
    }

    @Transactional
    public EntryView create(EntryRequest request, String actor) {
        Transaction entry = new Transaction();
        entry.setUser(users.findByUsername(actor).orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı.")));
        apply(entry, request);
        entry.setUpdatedBy(actor);
        entry.setUpdatedAt(Instant.now());
        entry = transactions.saveAndFlush(entry);
        audit(actor,"CREATE","TRANSACTION",entry.getId(),null,snapshot(entry));
        return view(entry);
    }

    @Transactional
    public EntryView update(Long id, EntryRequest request, String actor) {
        Transaction entry = require(id);
        if (entry.isCancelled()) throw new IllegalArgumentException("İptal edilen kayıt değiştirilemez.");
        checkVersion(entry, request.version());
        String before = snapshot(entry);
        apply(entry,request);
        entry.setUpdatedBy(actor);
        entry.setUpdatedAt(Instant.now());
        transactions.flush();
        audit(actor,"UPDATE","TRANSACTION",id,before,snapshot(entry));
        return view(entry);
    }

    @Transactional
    public void cancel(Long id, CancelRequest request, String actor) {
        Transaction entry = require(id);
        checkVersion(entry,request.version());
        if (entry.isCancelled()) throw new ConflictException("Bu kayıt zaten iptal edilmiş.");
        String before = snapshot(entry);
        entry.setCancelled(true);
        entry.setCancellationReason(request.reason().trim());
        entry.setUpdatedAt(Instant.now());
        entry.setUpdatedBy(actor);
        transactions.flush();
        audit(actor,"CANCEL","TRANSACTION",id,before,snapshot(entry));
    }

    private void checkVersion(Transaction entry, Long version) {
        if (!Objects.equals(entry.getVersion(),version))
            throw new ConflictException("Kayıt başka biri tarafından değiştirildi. Listeyi yenileyip tekrar deneyin.");
    }

    private Transaction require(Long id) {
        return transactions.findById(id).orElseThrow(() -> new ResourceNotFoundException("İşlem bulunamadı."));
    }

    private void apply(Transaction e, EntryRequest r) {
        Category category = categories.findById(r.categoryId())
            .orElseThrow(() -> new ResourceNotFoundException("Kategori bulunamadı."));
        if (category.getType() != r.type()) throw new IllegalArgumentException("Kategori, işlem türüyle eşleşmiyor.");
        if (r.dueDate()!=null && r.dueDate().isBefore(r.date()))
            throw new IllegalArgumentException("Vade tarihi işlem tarihinden önce olamaz.");
        if (r.paymentStatus()==PaymentStatus.PENDING && (r.counterpartyId()==null || r.dueDate()==null))
            throw new IllegalArgumentException("Bekleyen işlemler için cari hesap ve vade tarihi zorunludur.");
        Counterparty party = r.counterpartyId()==null ? null : parties.findById(r.counterpartyId())
            .orElseThrow(() -> new ResourceNotFoundException("Cari hesap bulunamadı."));
        e.setType(r.type()); e.setAmount(r.amount()); e.setDate(r.date()); e.setDescription(trim(r.description()));
        e.setCategory(category); e.setCounterparty(party); e.setDocumentNumber(trim(r.documentNumber()));
        e.setDepartment(trim(r.department())); e.setDueDate(r.dueDate()); e.setPaymentStatus(r.paymentStatus());
    }

    public EntryView view(Transaction e) {
        return new EntryView(e.getId(),e.getType(),e.getAmount(),e.getDate(),e.getDescription(),
            e.getCategory().getId(),e.getCategory().getName(),e.getCounterparty()==null?null:e.getCounterparty().getId(),
            e.getCounterparty()==null?null:e.getCounterparty().getName(),e.getDocumentNumber(),e.getDepartment(),
            e.getDueDate(),e.getPaymentStatus(),e.isCancelled(),e.getCancellationReason(),e.getVersion(),
            e.getUser().getUsername(),e.getCreatedAt(),e.getUpdatedBy(),e.getUpdatedAt());
    }

    private String snapshot(Transaction e) {
        // Canonical values, including linkage and cancellation reason, survive later edits.
        EntryView v = view(e);
        return v.toString();
    }

    public void audit(String actor,String action,String entity,Long id,String before,String after) {
        AuditEntry a=new AuditEntry(); a.setActor(actor); a.setAction(action); a.setEntityType(entity);
        a.setEntityId(id); a.setBeforeValue(before); a.setAfterValue(after); audits.save(a);
    }

    @Transactional
    public Category createCategory(CategoryRequest request, String actor) {
        String name=request.name().trim();
        if (categories.findAll().stream().anyMatch(c -> c.getType()==request.type() && c.getName().equalsIgnoreCase(name)))
            throw new ConflictException("Bu kategori zaten mevcut.");
        Category c=new Category(); c.setName(name); c.setType(request.type()); categories.save(c);
        audit(actor,"CREATE","CATEGORY",c.getId(),null,c.getName()+" / "+c.getType()); return c;
    }

    public List<PartyView> parties() {
        // Aggregate all outstanding balances in one database query, not one query per party.
        List<Object[]> rows=em.createQuery("select t.counterparty.id, t.type, sum(t.amount) from Transaction t "
            +"where t.cancelled=false and t.paymentStatus=:status and t.counterparty is not null "
            +"group by t.counterparty.id,t.type",Object[].class).setParameter("status",PaymentStatus.PENDING).getResultList();
        Map<Long,BigDecimal[]> balances=new HashMap<>();
        for(Object[] row:rows) balances.computeIfAbsent((Long)row[0],k->new BigDecimal[]{BigDecimal.ZERO,BigDecimal.ZERO})
            [row[1]==TransactionType.INCOME?0:1]=(BigDecimal)row[2];
        return parties.findAll(Sort.by("name")).stream().map(p->{
            BigDecimal[] b=balances.getOrDefault(p.getId(),new BigDecimal[]{BigDecimal.ZERO,BigDecimal.ZERO});
            return new PartyView(p.getId(),p.getName(),p.getTaxNumber(),p.getEmail(),p.getPhone(),p.getKind(),b[0],b[1]);
        }).toList();
    }

    @Transactional
    public Counterparty createParty(PartyRequest r,String actor) {
        Counterparty p=new Counterparty(); p.setName(r.name().trim()); p.setTaxNumber(trim(r.taxNumber()));
        p.setEmail(trim(r.email())); p.setPhone(trim(r.phone())); p.setKind(r.kind()); parties.save(p);
        audit(actor,"CREATE","COUNTERPARTY",p.getId(),null,p.getName()); return p;
    }

    public PageResult<AuditEntry> auditPage(int page) {
        if(page<0) throw new IllegalArgumentException("Geçersiz sayfa.");
        Page<AuditEntry> result=audits.findAll(PageRequest.of(page,30,Sort.by(Sort.Direction.DESC,"id")));
        return new PageResult<>(result.getContent(),result.getTotalElements(),result.getTotalPages(),page,30);
    }

    public String export(Filters filters) {
        long count=transactions.count(specification(filters));
        if(count>10000) throw new IllegalArgumentException("Dışa aktarmak için tarih aralığını daraltın (en fazla 10.000 kayıt).");
        StringBuilder csv=new StringBuilder("\uFEFFNo;Tarih;Tür;Tutar (TRY);Kategori;Cari hesap;Belge;Departman;Durum;Vade;İptal;Açıklama\r\n");
        for(Transaction e:transactions.findAll(specification(filters),Sort.by(Sort.Direction.DESC,"date"))) {
            EntryView v=view(e);
            Object[] values={v.id(),v.date(),v.type()==TransactionType.INCOME?"Gelir":"Gider",v.amount().toPlainString().replace('.',','),
                v.categoryName(),v.counterpartyName(),v.documentNumber(),v.department(),v.paymentStatus()==PaymentStatus.PAID?"Ödendi":"Bekliyor",
                v.dueDate(),v.cancelled()?"Evet":"Hayır",v.description()};
            csv.append(Arrays.stream(values).map(CompanyLedgerService::csvCell).collect(java.util.stream.Collectors.joining(";"))).append("\r\n");
        }
        return csv.toString();
    }

    public static String csvCell(Object value) {
        String s=value==null?"":value.toString();
        // Spreadsheet formula injection, including whitespace-prefixed expressions.
        String stripped=s.stripLeading();
        if(!stripped.isEmpty() && "=+@-".indexOf(stripped.charAt(0))>=0) s="'"+s;
        return "\""+s.replace("\"","\"\"")+"\"";
    }
    private static String trim(String s) { return s==null?null:s.trim(); }
}
