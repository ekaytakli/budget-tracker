package com.budgettracker.budget_tracker.config;

import com.budgettracker.budget_tracker.entity.*;
import com.budgettracker.budget_tracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component @RequiredArgsConstructor
public class CompanyBootstrap implements CommandLineRunner {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    @Value("${BOOTSTRAP_ADMIN_USERNAME:}") private String username;
    @Value("${BOOTSTRAP_ADMIN_PASSWORD:}") private String password;
    @Value("${BOOTSTRAP_ADMIN_EMAIL:}") private String email;
    @Override @Transactional
    public void run(String... args) {
        if(users.count()!=0) return;
        if(!username.matches("[a-zA-Z0-9._-]{3,80}") || password.length()<12 || password.length()>72 || !email.contains("@"))
            throw new IllegalStateException("Boş veritabanı için BOOTSTRAP_ADMIN_USERNAME, BOOTSTRAP_ADMIN_EMAIL ve en az 12 karakterli BOOTSTRAP_ADMIN_PASSWORD ayarlayın.");
        users.save(User.builder().username(username).email(email).password(encoder.encode(password)).role(UserRole.ADMIN).build());
    }
}
