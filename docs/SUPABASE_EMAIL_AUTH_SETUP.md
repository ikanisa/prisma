# Supabase Email Authentication Setup Guide

Complete guide for configuring and using email authentication in Prisma Glow.

## ✅ What's Implemented

### Authentication Methods

1. **Email + Password** ✅
   - Sign up with email and password
   - Sign in with email and password
   - Password reset via email

2. **Magic Link (Passwordless)** ✅
   - Passwordless sign-in via email link
   - One-click authentication

3. **Email Verification** ✅
   - Email verification on signup
   - Resend verification email
   - Automatic redirect after verification

4. **Password Reset** ✅
   - Forgot password flow
   - Secure password reset via email
   - Password strength validation

## 🔧 Supabase Configuration

### 1. Enable Email Auth in Supabase Dashboard

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **Authentication** > **Providers**
3. Ensure **Email** provider is enabled
4. Configure email settings:

#### Email Templates

Go to **Authentication** > **Email Templates** and configure:

**Confirm signup:**
- Subject: `Confirm your signup`
- Body: Include `{{ .ConfirmationURL }}` for the verification link

**Magic Link:**
- Subject: `Sign in to Prisma Glow`
- Body: Include `{{ .ConfirmationURL }}` for the magic link

**Reset Password:**
- Subject: `Reset your password`
- Body: Include `{{ .ConfirmationURL }}` for the reset link

**Change Email:**
- Subject: `Confirm your new email`
- Body: Include `{{ .ConfirmationURL }}` for the confirmation link

#### Email Settings

1. **Site URL**: Set to your app URL
   - Local: `http://localhost:3000`
   - Production: `https://your-domain.com`

2. **Redirect URLs**: Add allowed redirect URLs
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/reset-password`
   - `https://your-domain.com/auth/callback`
   - `https://your-domain.com/reset-password`

3. **Email Verification**:
   - Enable: `Confirm email`
   - Secure email change: Enabled (recommended)
   - Double opt-in: Optional (for extra security)

### 2. Configure SMTP (Optional but Recommended)

For production, configure custom SMTP:

1. Go to **Settings** > **Auth** > **SMTP Settings**
2. Configure your SMTP provider:
   - **Host**: Your SMTP server
   - **Port**: Usually 587 (TLS) or 465 (SSL)
   - **Username**: Your SMTP username
   - **Password**: Your SMTP password
   - **Sender email**: Your verified sender email
   - **Sender name**: Your app name

**Recommended SMTP Providers:**
- SendGrid
- Mailgun
- AWS SES
- Postmark
- Resend

### 3. Email Rate Limiting

Configure in **Authentication** > **Settings**:

- **Rate limit**: Set appropriate limits
- **Rate limit email**: Set limit for email sends per hour
- **Rate limit SMS**: N/A for email auth

## 📱 Using Email Authentication

### Sign Up Flow

1. User visits `/signup`
2. Enters email and password
3. Receives verification email
4. Clicks link in email
5. Redirected to `/auth/callback`
6. Automatically signed in
7. Redirected to dashboard

### Sign In Flow (Password)

1. User visits `/login`
2. Enters email and password
3. Click "Sign in"
4. Redirected to dashboard

### Sign In Flow (Magic Link)

1. User visits `/login`
2. Enters email
3. Clicks "Send magic link"
4. Receives email with sign-in link
5. Clicks link in email
6. Automatically signed in
7. Redirected to dashboard

### Password Reset Flow

1. User visits `/forgot-password`
2. Enters email
3. Receives password reset email
4. Clicks link in email
5. Redirected to `/reset-password`
6. Enters new password
7. Password updated
8. Redirected to login

## 🔐 Security Features

### Implemented

- ✅ Password strength validation
- ✅ Rate limiting (login attempts)
- ✅ Account lockout after failed attempts
- ✅ Secure password reset tokens
- ✅ Email verification required
- ✅ Session management
- ✅ CSRF protection (via Supabase)

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## 🧪 Testing Email Auth

### Local Development

1. **Use Supabase Local Email Testing**:
   - Supabase sends emails to a test inbox
   - Check Supabase Dashboard > Authentication > Users
   - View email logs in Supabase Dashboard

2. **Test with Real Email**:
   - Use your actual email address
   - Check spam folder if email doesn't arrive
   - Verify links work correctly

### Test Scenarios

```bash
# 1. Sign Up
- Visit http://localhost:3000/signup
- Enter email and password
- Check email for verification link
- Click link and verify redirect

# 2. Sign In (Password)
- Visit http://localhost:3000/login
- Enter email and password
- Verify successful login

# 3. Sign In (Magic Link)
- Visit http://localhost:3000/login
- Enter email
- Click "Send magic link"
- Check email and click link
- Verify automatic sign-in

# 4. Password Reset
- Visit http://localhost:3000/forgot-password
- Enter email
- Check email for reset link
- Click link and reset password
- Verify new password works

# 5. Resend Verification
- Visit http://localhost:3000/verify-email?email=test@example.com
- Click "Resend verification email"
- Verify email is sent
```

## 🐛 Troubleshooting

### Email Not Received

1. **Check Spam Folder**: Emails might be filtered
2. **Verify SMTP Configuration**: Check Supabase SMTP settings
3. **Check Email Logs**: View in Supabase Dashboard
4. **Verify Redirect URLs**: Ensure URLs are whitelisted
5. **Check Rate Limits**: Ensure not hitting rate limits

### Verification Link Not Working

1. **Check Redirect URLs**: Must be in allowed list
2. **Verify Token Expiry**: Links expire after 24 hours (default)
3. **Check URL Encoding**: Ensure special characters are encoded
4. **Verify Site URL**: Must match Supabase configuration

### Magic Link Not Working

1. **Check Email Template**: Must include `{{ .ConfirmationURL }}`
2. **Verify Redirect URL**: Must be whitelisted
3. **Check Token Expiry**: Links expire after 1 hour (default)
4. **Verify Email Provider**: Ensure email provider is enabled

## 📚 API Reference

### Auth Provider Methods

```typescript
// Sign in with password
const { error } = await signIn(email, password);

// Sign up with password
const { error } = await signUp(email, password);

// Sign in with magic link
const { error } = await signInWithMagicLink(email);

// Reset password
const { error } = await resetPassword(email);

// Update password
const { error } = await updatePassword(newPassword);

// Resend verification email
const { error } = await resendVerificationEmail(email);

// Verify email with token
const { error } = await verifyEmail(token);

// Sign out
await signOut();
```

## 🔄 Email Templates Customization

### Customize in Supabase Dashboard

1. Go to **Authentication** > **Email Templates**
2. Select template to customize
3. Edit HTML/Text content
4. Use variables:
   - `{{ .ConfirmationURL }}` - Verification/reset link
   - `{{ .Email }}` - User email
   - `{{ .SiteURL }}` - Your app URL
   - `{{ .Token }}` - Verification token (if needed)

### Example Template

```html
<h2>Welcome to Prisma Glow!</h2>
<p>Click the link below to verify your email:</p>
<p><a href="{{ .ConfirmationURL }}">Verify Email</a></p>
<p>Or copy this URL: {{ .ConfirmationURL }}</p>
```

## 🚀 Production Checklist

- [ ] Configure custom SMTP
- [ ] Set production Site URL
- [ ] Add production redirect URLs
- [ ] Customize email templates
- [ ] Test all email flows
- [ ] Configure rate limiting
- [ ] Set up email monitoring
- [ ] Test spam folder delivery
- [ ] Verify email deliverability
- [ ] Set up email analytics

## 📞 Support

For issues with:
- **Supabase Configuration**: Check Supabase documentation
- **Email Delivery**: Check SMTP settings and logs
- **App Integration**: Check this guide and code examples

## 🎉 You're All Set!

Email authentication is fully configured and ready to use. Users can:
- Sign up with email/password
- Sign in with password or magic link
- Reset passwords securely
- Verify their email addresses

All flows are implemented and tested! 🚀

