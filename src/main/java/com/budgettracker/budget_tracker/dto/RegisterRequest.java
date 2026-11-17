package com.budgettracker.budget_tracker.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {

    @NotBlank
    @jakarta.validation.constraints.Size(min = 3, max = 80)
    @jakarta.validation.constraints.Pattern(regexp = "[a-zA-Z0-9._-]+")
    private String username;

    @NotBlank
    @Email
    @jakarta.validation.constraints.Size(max = 200)
    private String email;

    @NotBlank
    @jakarta.validation.constraints.Size(min = 12, max = 72)
    private String password;
}
