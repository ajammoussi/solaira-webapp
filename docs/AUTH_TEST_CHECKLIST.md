# Authentication Test Checklist

Manual test scenarios for the Solaira auth system.

## Prerequisites
- [ ] Supabase project created and configured
- [ ] Environment variables set in `.env.local`
- [ ] OAuth providers configured (Google, GitHub)
- [ ] Anonymous sign-ins enabled

---

## 1. Sign Up Flow

### 1.1 Email/Password Registration
- [ ] Navigate to `/signup`
- [ ] Leave all fields empty, click "Create Account" → Shows validation errors
- [ ] Enter invalid email format → Shows email validation error
- [ ] Enter password < 8 chars → Shows password length error
- [ ] Enter password without uppercase/lowercase/number → Shows complexity error
- [ ] Enter mismatched passwords → Shows confirmation error
- [ ] Uncheck terms checkbox → Shows terms error
- [ ] Fill valid form, submit → Shows success message
- [ ] Check email for confirmation link
- [ ] Click confirmation link → Redirected to app

### 1.2 OAuth Registration
- [ ] Click "Continue with Google" → Redirected to Google
- [ ] Complete Google auth → Redirected to `/callback` → `/dashboard`
- [ ] Click "Continue with GitHub" → Redirected to GitHub
- [ ] Complete GitHub auth → Redirected to `/callback` → `/dashboard`

### 1.3 Guest Access from Sign Up
- [ ] Click "Enter as Guest" → Redirected to `/dashboard`
- [ ] Verify guest badge shown in account

---

## 2. Sign In Flow

### 2.1 Email/Password Login
- [ ] Navigate to `/signin`
- [ ] Leave fields empty, submit → Shows validation errors
- [ ] Enter invalid email → Shows email error
- [ ] Enter wrong credentials → Shows "Invalid email or password" error
- [ ] Enter correct credentials → Redirected to dashboard
- [ ] "Remember me" checkbox is functional

### 2.2 OAuth Login
- [ ] Click "Continue with Google" → Successful login
- [ ] Click "Continue with GitHub" → Successful login

### 2.3 Guest Access from Sign In
- [ ] Click "Enter as Guest" → Creates anonymous session
- [ ] Redirected to dashboard with limited access

---

## 3. Forgot Password Flow

### 3.1 Request Reset Link
- [ ] Navigate to `/forgot-password`
- [ ] Submit empty form → Shows validation error
- [ ] Enter invalid email → Shows format error
- [ ] Enter valid email → Shows success message
- [ ] "Resend" button disabled for 60 seconds
- [ ] Check email for reset link

### 3.2 Reset Password
- [ ] Click reset link in email → Opens `/reset-password`
- [ ] Enter weak password → Shows validation error
- [ ] Enter mismatched passwords → Shows error
- [ ] Enter valid new password → Success, redirected to sign in
- [ ] Sign in with new password → Successful

### 3.3 Expired/Invalid Link
- [ ] Visit `/reset-password` without valid session → Shows expired message
- [ ] "Request New Reset Link" button works

---

## 4. Account Page (Protected)

### 4.1 Access Control
- [ ] Visit `/account` when logged out → Redirected to sign in
- [ ] Visit `/account` when logged in → Shows account page

### 4.2 Profile Update
- [ ] Change full name → Saves successfully
- [ ] Change phone/company → Saves successfully
- [ ] Shows success message after save

### 4.3 Password Change
- [ ] Enter short password → Shows error
- [ ] Enter mismatched passwords → Shows error
- [ ] Enter valid new password → Shows success message

### 4.4 Sign Out
- [ ] Click "Sign Out" in header → Signed out, redirected to home

### 4.5 Guest Account View
- [ ] Log in as guest → Account page shows guest badge
- [ ] Profile form hidden for guests
- [ ] Shows upgrade prompt with link to sign up

---

## 5. Route Protection

### 5.1 Client-Side Protection
- [ ] Visit `/dashboard` when logged out → Redirected to sign in
- [ ] Visit `/dashboard` when logged in → Shows dashboard
- [ ] Sign out → Automatically redirected away from protected pages

### 5.2 Redirect After Login
- [ ] Visit protected page while logged out
- [ ] Redirected to sign in with `?redirect=` param
- [ ] After login → Redirected back to original page

### 5.3 Redirect Away from Auth Pages
- [ ] Visit `/signin` while logged in → Redirected to dashboard
- [ ] Visit `/signup` while logged in → Redirected to dashboard

---

## 6. UX & Accessibility

### 6.1 Loading States
- [ ] Submit button shows spinner during API calls
- [ ] Form fields disabled during submission
- [ ] Page shows loading state during auth check

### 6.2 Error Messages
- [ ] Error messages are clear and actionable
- [ ] Field-level errors shown below inputs
- [ ] General errors shown in alert box

### 6.3 Responsive Design
- [ ] Forms display correctly on mobile (320px)
- [ ] Forms display correctly on tablet (768px)
- [ ] Forms display correctly on desktop (1200px)

### 6.4 Accessibility
- [ ] All inputs have labels
- [ ] Required fields marked with asterisk
- [ ] Error messages linked with aria-describedby
- [ ] Tab navigation works correctly
- [ ] Password toggle button is accessible

---

## 7. Edge Cases

### 7.1 Session Handling
- [ ] Refresh page while logged in → Session persists
- [ ] Open app in new tab → Same session maintained
- [ ] Close browser, reopen → Session restored (if "remember me")

### 7.2 Multiple Tabs
- [ ] Sign out in one tab → Other tabs reflect signed out state
- [ ] Sign in in one tab → Other tabs reflect signed in state

### 7.3 Network Issues
- [ ] Submit form with no network → Shows error message
- [ ] OAuth callback with no network → Shows error

---

## Test Results

| Test Area | Pass | Fail | Notes |
|-----------|------|------|-------|
| Sign Up | | | |
| Sign In | | | |
| Forgot Password | | | |
| Account Page | | | |
| Route Protection | | | |
| UX & Accessibility | | | |
| Edge Cases | | | |

**Tested By:** _______________  
**Date:** _______________  
**Environment:** _______________
