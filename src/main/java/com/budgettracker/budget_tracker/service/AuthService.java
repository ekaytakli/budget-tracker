package com.budgettracker.budget_tracker.service;

import com.budgettracker.budget_tracker.dto.LoginRequest;
import com.budgettracker.budget_tracker.dto.LoginResponse;
import com.budgettracker.budget_tracker.dto.RegisterRequest;
import com.budgettracker.budget_tracker.dto.UserResponse;
import com.budgettracker.budget_tracker.entity.User;
import com.budgettracker.budget_tracker.exception.AuthenticationException;
import com.budgettracker.budget_tracker.exception.ConflictException;
import com.budgettracker.budget_tracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public UserResponse register(RegisterRequest request) {

        if (request.getPassword().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
            throw new IllegalArgumentException("Parola UTF-8 biçiminde en fazla 72 bayt olabilir.");

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ConflictException("Bu kullanıcı adı zaten kullanılıyor.");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Bu e-posta adresi zaten kullanılıyor.");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        User savedUser = userRepository.save(user);

        return UserResponse.builder()
                .id(savedUser.getId())
                .username(savedUser.getUsername())
                .email(savedUser.getEmail())
                .role(savedUser.getRole())
                .active(savedUser.isActive())
                .build();
    }

    public LoginResponse login(LoginRequest request) {

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() ->
                        new AuthenticationException(
                                "Invalid username or password"
                        ));

        if (!user.isActive()) throw new AuthenticationException("Invalid username or password");

        if (!passwordEncoder.matches(
                request.getPassword(),
                user.getPassword()
        )) {
            throw new AuthenticationException(
                    "Invalid username or password"
            );
        }

        String token = jwtService.generateToken(user.getUsername());

        return LoginResponse.builder()
                .token(token)
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }
}
