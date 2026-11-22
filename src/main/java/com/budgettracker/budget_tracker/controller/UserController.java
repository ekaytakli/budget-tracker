package com.budgettracker.budget_tracker.controller;

import com.budgettracker.budget_tracker.entity.User;
import com.budgettracker.budget_tracker.entity.UserRole;
import com.budgettracker.budget_tracker.dto.*;
import com.budgettracker.budget_tracker.dto.CompanyDtos.RoleRequest;
import com.budgettracker.budget_tracker.dto.CompanyDtos.PasswordRequest;
import com.budgettracker.budget_tracker.service.AuthService;
import com.budgettracker.budget_tracker.service.CompanyLedgerService;
import com.budgettracker.budget_tracker.exception.*;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import java.security.Principal;
import java.util.List;
import com.budgettracker.budget_tracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final AuthService authService;
    private final CompanyLedgerService ledger;
    private final org.springframework.security.crypto.password.PasswordEncoder encoder;

    @PostMapping @PreAuthorize("hasRole('ADMIN')") @Transactional
    public ResponseEntity<UserResponse> createUser(
            @Valid @RequestBody RegisterRequest request, Principal principal
    ) {
        UserResponse savedUser = authService.register(request);
        ledger.audit(principal.getName(),"CREATE","USER",savedUser.getId(),null,savedUser.getUsername()+" / "+savedUser.getRole());

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(savedUser);
    }

    @GetMapping("/me")
    public UserResponse me(Principal p) { return view(userRepository.findByUsername(p.getName()).orElseThrow()); }

    @GetMapping @PreAuthorize("hasRole('ADMIN')")
    public List<UserResponse> list() { return userRepository.findAll().stream().map(this::view).toList(); }

    @PatchMapping("/{id}/role") @PreAuthorize("hasRole('ADMIN')") @Transactional
    public UserResponse role(@PathVariable Long id,@Valid @RequestBody RoleRequest request,Principal p) {
        List<User> locked=userRepository.lockAllUsers();
        User user=locked.stream().filter(u->u.getId().equals(id)).findFirst()
            .orElseThrow(()->new ResourceNotFoundException("Kullanıcı bulunamadı."));
        UserRole before=user.getRole();
        boolean active=request.active()==null?user.isActive():request.active();
        if(before==UserRole.ADMIN && user.isActive() && (request.role()!=UserRole.ADMIN || !active) && locked.stream().filter(u->u.getRole()==UserRole.ADMIN && u.isActive()).count()<=1)
            throw new ConflictException("Son yöneticinin yetkisi kaldırılamaz.");
        user.setRole(request.role());
        String beforeAccess=before.name()+" / active="+user.isActive();
        user.setActive(active);
        user.setCredentialVersion(user.getCredentialVersion()+1);
        ledger.audit(p.getName(),"ROLE_CHANGE","USER",id,beforeAccess,request.role().name()+" / active="+active);
        return view(user);
    }

    private UserResponse view(User u) {
        return UserResponse.builder().id(u.getId()).username(u.getUsername()).email(u.getEmail()).role(u.getRole()).active(u.isActive()).build();
    }

    @PostMapping("/me/password") @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional
    public void password(@Valid @RequestBody PasswordRequest request, Principal p) {
        User user=userRepository.findByUsername(p.getName()).orElseThrow();
        if(!encoder.matches(request.currentPassword(),user.getPassword()))
            throw new IllegalArgumentException("Mevcut parola doğru değil.");
        if(request.newPassword().getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72)
            throw new IllegalArgumentException("Yeni parola UTF-8 olarak en fazla 72 bayt olabilir.");
        user.setPassword(encoder.encode(request.newPassword()));
        user.setCredentialVersion(user.getCredentialVersion()+1);
        ledger.audit(p.getName(),"PASSWORD_CHANGE","USER",user.getId(),null,"Tüm eski oturumlar sonlandırıldı.");
    }
}
