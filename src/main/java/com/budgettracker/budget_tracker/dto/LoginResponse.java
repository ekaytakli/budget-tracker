package com.budgettracker.budget_tracker.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginResponse {

    private String token;
    private Long userId;
    private String username;
    private String email;
}