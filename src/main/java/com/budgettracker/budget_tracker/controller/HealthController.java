package com.budgettracker.budget_tracker.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController @RequiredArgsConstructor
public class HealthController {
    private final JdbcTemplate jdbc;
    @GetMapping("/api/health")
    public ResponseEntity<Map<String,String>> health() {
        try {
            jdbc.queryForObject("SELECT 1",Integer.class);
            return ResponseEntity.ok(Map.of("status","UP"));
        } catch(org.springframework.dao.DataAccessException exception) {
            return ResponseEntity.status(503).body(Map.of("status","DOWN"));
        }
    }
}
