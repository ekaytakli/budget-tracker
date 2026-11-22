package com.budgettracker.budget_tracker.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {

    @NotBlank(message = "Kullanıcı adı zorunludur.")
    @Size(min = 3, max = 80, message = "Kullanıcı adı 3–80 karakter olmalıdır.")
    @Pattern(regexp = "[a-zA-Z0-9._-]+", message = "Kullanıcı adında yalnızca a-z, A-Z, rakam, nokta, alt çizgi veya tire kullanın.")
    private String username;

    @NotBlank(message = "E-posta zorunludur.")
    @Email(message = "Geçerli bir e-posta adresi girin.")
    @Size(max = 200, message = "E-posta en fazla 200 karakter olabilir.")
    private String email;

    @NotBlank(message = "Parola zorunludur.")
    @Size(min = 12, max = 72, message = "Parola 12–72 karakter olmalıdır (UTF-8 olarak en fazla 72 bayt).")
    private String password;
}
