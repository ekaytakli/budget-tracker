package com.budgettracker.budget_tracker;

import com.budgettracker.budget_tracker.entity.*;
import com.budgettracker.budget_tracker.repository.*;
import com.budgettracker.budget_tracker.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
    "spring.datasource.url=jdbc:h2:mem:ledger;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa",
    "spring.datasource.password=", "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false", "spring.jpa.open-in-view=false",
    "app.jwt-secret=integration-test-only-signing-key-64-characters-not-a-real-secret",
    "BOOTSTRAP_ADMIN_USERNAME=initialadmin", "BOOTSTRAP_ADMIN_EMAIL=initial@example.test",
    "BOOTSTRAP_ADMIN_PASSWORD=initial-test-password"
})
class CompanyLedgerIntegrationTests {
    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired CategoryRepository categories;
    @Autowired TransactionRepository transactions;
    @Autowired CounterpartyRepository parties;
    @Autowired AuditRepository audits;
    @Autowired JwtService jwt;
    @Autowired PasswordEncoder encoder;
    @Autowired ObjectMapper json;
    String admin,accountant,viewer;
    Long income,expense,party;
    final HttpClient http=HttpClient.newHttpClient();

    @BeforeEach void prepare() {
        audits.deleteAll();transactions.deleteAll();parties.deleteAll();categories.deleteAll();users.deleteAll();
        for(UserRole role:UserRole.values()) {
            String name=role.name().toLowerCase(Locale.ROOT);
            users.save(User.builder().username(name).email(name+"@example.test")
                .password(encoder.encode("test-password-123")).role(role).build());
        }
        admin=jwt.generateToken("admin");accountant=jwt.generateToken("accountant");viewer=jwt.generateToken("viewer");
        Category a=new Category();a.setName("Satış");a.setType(TransactionType.INCOME);income=categories.save(a).getId();
        Category b=new Category();b.setName("Kira");b.setType(TransactionType.EXPENSE);expense=categories.save(b).getId();
        Counterparty p=new Counterparty();p.setName("Test Cari");p.setKind("CUSTOMER");party=parties.save(p).getId();
    }

    HttpResponse<String> call(String method,String path,String token,Object body) throws Exception {
        HttpRequest.Builder r=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api"+path));
        if(token!=null)r.header("Authorization","Bearer "+token);
        r.header("Content-Type","application/json");
        r.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        return http.send(r.build(),HttpResponse.BodyHandlers.ofString());
    }
    JsonNode tree(HttpResponse<String> r){assertTrue(r.statusCode()>=200 && r.statusCode()<300,r.statusCode()+" "+r.body());return json.readTree(r.body());}
    Map<String,Object> entry(String type,String amount,String status) {
        Map<String,Object> p=new HashMap<>();
        p.put("type",type);p.put("amount",amount);p.put("paymentStatus",status);
        p.put("date","2026-01-01");p.put("categoryId",type.equals("INCOME")?income:expense);
        p.put("description","Deneme kaydı");p.put("documentNumber","DOC-123");
        if(status.equals("PENDING")){p.put("counterpartyId",party);p.put("dueDate","2026-01-02");}
        return p;
    }
    JsonNode create(Map<String,Object> p) throws Exception {
        HttpResponse<String> r=call("POST","/company/transactions",accountant,p);
        assertEquals(201,r.statusCode(),r.body());return tree(r);
    }
    void decimal(String expected,JsonNode actual){assertEquals(0,new BigDecimal(expected).compareTo(actual.decimalValue()));}

    @Test void authenticationAndRolesAreEnforcedAtTheApi() throws Exception {
        assertEquals(401,call("GET","/company/transactions",null,null).statusCode());
        assertEquals(403,call("POST","/company/transactions",viewer,entry("INCOME","10","PAID")).statusCode());
        assertEquals(403,call("GET","/company/audit",accountant,null).statusCode());
        assertEquals(403,call("POST","/users",accountant,Map.of("username","intruder","email","x@example.test","password","something-secret")).statusCode());
        assertEquals(403,call("POST","/transactions",viewer,entry("INCOME","10","PAID")).statusCode());
        assertEquals(0,transactions.count());
    }

    @Test void publicRegistrationCreatesOnlyAViewerAndSupportsLogin() throws Exception {
        Map<String,Object> registration=new HashMap<>(Map.of("username","newmember","email","new@example.test","password","test-password-123"));
        registration.put("role","ADMIN");
        HttpResponse<String> response=call("POST","/auth/register",null,registration);
        assertEquals(201,response.statusCode(),response.body());
        JsonNode user=tree(response);
        assertEquals("VIEWER",user.get("role").asText());
        assertFalse(user.has("password"));
        assertTrue(encoder.matches("test-password-123",users.findByUsername("newmember").orElseThrow().getPassword()));
        JsonNode login=tree(call("POST","/auth/login",null,Map.of("username","newmember","password","test-password-123")));
        String token=login.get("token").asText();
        assertEquals(200,call("GET","/company/summary",token,null).statusCode());
        assertEquals(403,call("POST","/company/transactions",token,entry("INCOME","10","PAID")).statusCode());
        assertEquals(403,call("GET","/users",token,null).statusCode());
        assertEquals(409,call("POST","/auth/register",null,registration).statusCode());
        registration.put("username","othermember");
        assertEquals(409,call("POST","/auth/register",null,registration).statusCode());
        registration.put("email","other@example.test");
        registration.put("password","short");
        assertEquals(400,call("POST","/auth/register",null,registration).statusCode());
        assertEquals(4,users.count());
    }

    @Test void exactTotalsSeparateCashFromReceivablesAndIgnoreCancelledEntries() throws Exception {
        JsonNode first=create(entry("INCOME","100.10","PAID"));
        create(entry("INCOME","200.20","PENDING"));create(entry("EXPENSE","30.05","PAID"));
        JsonNode s=tree(call("GET","/company/summary",viewer,null));
        decimal("300.30",s.get("income"));decimal("270.25",s.get("net"));decimal("70.05",s.get("cashBalance"));decimal("200.20",s.get("receivable"));
        assertEquals(204,call("POST","/company/transactions/"+first.get("id").asLong()+"/cancel",accountant,
            Map.of("reason","Yanlış kayıt","version",first.get("version").asLong())).statusCode());
        JsonNode after=tree(call("GET","/company/summary?includeCancelled=true",viewer,null));
        decimal("200.20",after.get("income"));assertEquals(3,transactions.count());assertEquals(4,audits.count());
        assertEquals(2,tree(call("GET","/company/transactions",viewer,null)).get("totalElements").asInt());
        assertEquals(3,tree(call("GET","/company/transactions?includeCancelled=true",viewer,null)).get("totalElements").asInt());
        decimal("200.20",tree(call("GET","/company/counterparties",viewer,null)).get(0).get("receivable"));
    }

    @Test void invalidAmountsCategoryTypesAndIncompletePayablesAreRejected() throws Exception {
        Map<String,Object> p=entry("INCOME","1.001","PAID");
        assertEquals(400,call("POST","/company/transactions",accountant,p).statusCode());
        p=entry("INCOME","10","PAID");p.put("categoryId",expense);
        assertEquals(400,call("POST","/company/transactions",accountant,p).statusCode());
        p=entry("EXPENSE","10","PENDING");p.remove("counterpartyId");
        assertEquals(400,call("POST","/company/transactions",accountant,p).statusCode());
        p=entry("EXPENSE","10","PENDING");p.put("dueDate","2025-12-31");
        assertEquals(400,call("POST","/company/transactions",accountant,p).statusCode());
        assertEquals(0,transactions.count());assertEquals(0,audits.count());
    }

    @Test void staleUpdatesFailAndAuditCapturesBothVersions() throws Exception {
        JsonNode first=create(entry("INCOME","10","PAID"));
        String path="/company/transactions/"+first.get("id").asLong();
        Map<String,Object> p=entry("INCOME","20","PAID");p.put("version",first.get("version").asLong());
        assertEquals(200,call("PUT",path,accountant,p).statusCode());
        assertEquals(409,call("PUT",path,accountant,p).statusCode());
        assertEquals(2,audits.count());
        String history=call("GET","/company/audit",admin,null).body();
        assertTrue(history.contains("amount=10"));assertTrue(history.contains("amount=20"));
    }

    @Test void combinedFiltersAndPaginationApplyToSummaryAndExport() throws Exception {
        create(entry("INCOME","100","PAID"));create(entry("EXPENSE","50","PAID"));
        String filter="?type=INCOME&start=2026-01-01&end=2026-01-31&q=DOC-123&categoryId="+income;
        JsonNode page=tree(call("GET","/company/transactions"+filter+"&size=1",viewer,null));
        assertEquals(1,page.get("totalElements").asInt());
        decimal("100",tree(call("GET","/company/summary"+filter,viewer,null)).get("income"));
        JsonNode reports=tree(call("GET","/company/reports"+filter,viewer,null));
        assertEquals("2026-01",reports.get(0).get("period").asText());
        decimal("100",reports.get(0).get("income"));
        JsonNode report=tree(call("GET","/company/reports"+filter,viewer,null));
        assertEquals("2026-01",report.get(0).get("period").asText());
        decimal("100",report.get(0).get("income"));
        String csv=call("GET","/company/export"+filter,viewer,null).body();
        assertTrue(csv.contains("DOC-123"));assertFalse(csv.contains("Gider"));
        assertEquals(400,call("GET","/company/transactions?start=2026-02-01&end=2026-01-01",viewer,null).statusCode());
        assertEquals(400,call("GET","/company/transactions?size=101",viewer,null).statusCode());
    }

    @Test void adminCreatesHashedAccountsWithoutLeakingPasswordsAndCannotRemoveLastAdmin() throws Exception {
        HttpResponse<String> r=call("POST","/users",admin,Map.of("username","newstaff","email","staff@example.test","password","a-test-password-123"));
        assertEquals(201,r.statusCode(),r.body());assertFalse(r.body().contains("password"));
        User staff=users.findByUsername("newstaff").orElseThrow();
        assertEquals(UserRole.VIEWER,staff.getRole());assertTrue(encoder.matches("a-test-password-123",staff.getPassword()));
        Long adminId=users.findByUsername("admin").orElseThrow().getId();
        assertEquals(409,call("PATCH","/users/"+adminId+"/role",admin,Map.of("role","VIEWER")).statusCode());
        assertEquals(200,call("PATCH","/users/"+staff.getId()+"/role",admin,Map.of("role","ACCOUNTANT")).statusCode());
    }

    @Test void csvNeutralisesSpreadsheetFormulasIncludingMultilineInput() {
        assertTrue(CompanyLedgerService.csvCell("  =HYPERLINK(\"x\")\nnext").startsWith("\"'"));
        assertTrue(CompanyLedgerService.csvCell("@SUM(1)").startsWith("\"'"));
        assertEquals("\"plain;value\"",CompanyLedgerService.csvCell("plain;value"));
    }

    @Test void deactivationRevokesTokensAndRejectsLoginEvenAfterReactivation() throws Exception {
        Long id=users.findByUsername("viewer").orElseThrow().getId();
        assertEquals(200,call("PATCH","/users/"+id+"/role",admin,Map.of("role","VIEWER","active",false)).statusCode());
        assertEquals(401,call("GET","/users/me",viewer,null).statusCode());
        assertEquals(401,call("POST","/auth/login",null,Map.of("username","viewer","password","test-password-123")).statusCode());
        assertEquals(200,call("PATCH","/users/"+id+"/role",admin,Map.of("role","VIEWER","active",true)).statusCode());
        assertEquals(401,call("GET","/users/me",viewer,null).statusCode());
        assertEquals(200,call("POST","/auth/login",null,Map.of("username","viewer","password","test-password-123")).statusCode());
        Long adminId=users.findByUsername("admin").orElseThrow().getId();
        assertEquals(409,call("PATCH","/users/"+adminId+"/role",admin,Map.of("role","ADMIN","active",false)).statusCode());
    }

    @Test void passwordRotationInvalidatesAllPreviousTokensAndDoesNotLogSecrets() throws Exception {
        assertEquals(400,call("POST","/users/me/password",accountant,
            Map.of("currentPassword","wrong","newPassword","new-password-test-123")).statusCode());
        assertEquals(204,call("POST","/users/me/password",accountant,
            Map.of("currentPassword","test-password-123","newPassword","new-password-test-123")).statusCode());
        assertEquals(401,call("GET","/users/me",accountant,null).statusCode());
        assertEquals(401,call("POST","/auth/login",null,Map.of("username","accountant","password","test-password-123")).statusCode());
        assertEquals(200,call("POST","/auth/login",null,Map.of("username","accountant","password","new-password-test-123")).statusCode());
        String history=call("GET","/company/audit",admin,null).body();
        assertTrue(history.contains("PASSWORD_CHANGE"));assertFalse(history.contains("new-password-test-123"));
    }
}
