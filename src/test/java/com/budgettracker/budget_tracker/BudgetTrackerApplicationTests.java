package com.budgettracker.budget_tracker;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:context;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.flyway.enabled=false",
    "app.jwt-secret=unit-test-only-signing-key-at-least-64-characters-not-a-real-secret",
    "BOOTSTRAP_ADMIN_USERNAME=contextadmin", "BOOTSTRAP_ADMIN_EMAIL=context@example.test",
    "BOOTSTRAP_ADMIN_PASSWORD=context-test-password"
})
class BudgetTrackerApplicationTests {

	@Test
	void contextLoads() {
	}

}
