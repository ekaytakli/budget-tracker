package com.budgettracker.budget_tracker.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
@lombok.RequiredArgsConstructor
public class JwtService {

    private final com.budgettracker.budget_tracker.repository.UserRepository users;

    @org.springframework.beans.factory.annotation.Value("${app.jwt-secret}")
    private String secretKey;

    private static final long EXPIRATION_TIME =
            1000 * 60 * 60 * 24; // 24 saat

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(
                secretKey.getBytes(StandardCharsets.UTF_8)
        );
    }

    public String generateToken(String username) {

        return Jwts.builder()
                .subject(username)
                .claim("cv", users.findByUsername(username).orElseThrow().getCredentialVersion())
                .issuedAt(new Date())
                .expiration(
                        new Date(System.currentTimeMillis() + EXPIRATION_TIME)
                )
                .signWith(getSigningKey())
                .compact();
    }

    public String extractUsername(String token) {

        return extractClaims(token).getSubject();
    }

    public long credentialVersion(String token) {
        Object value=extractClaims(token).get("cv");
        return value instanceof Number number ? number.longValue() : -1;
    }

    public boolean isTokenValid(
            String token,
            String username
    ) {

        String tokenUsername = extractUsername(token);

        return tokenUsername.equals(username)
                && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {

        return extractClaims(token)
                .getExpiration()
                .before(new Date());
    }

    private Claims extractClaims(String token) {

        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
