# MongoDB URI Fix

## Issue Found

Your current MONGO_URI has a formatting issue. The password contains an `@` symbol which needs to be URL-encoded.

## Current Connection String
```
mongodb+srv://nuvix_user:something@17@cluster17.sb4rqbz.mongodb.net/?appName=cluster17
```

## Problem
- Password `something@17` contains `@` which needs URL encoding as `%40`
- Missing database name (should add `/nuvix` before the `?`)
- Query parameters should use standard MongoDB options

## Fixed Connection String Format

If your password is `something@17`, it should be encoded as `something%4017`:

```
mongodb+srv://nuvix_user:something%4017@cluster17.sb4rqbz.mongodb.net/nuvix?retryWrites=true&w=majority
```

### Steps to Fix:

1. **URL-encode special characters in password:**
   - `@` → `%40`
   - `#` → `%23`
   - `$` → `%24`
   - `%` → `%25`
   - `&` → `%26`
   - `+` → `%2B`
   - `=` → `%3D`

2. **Add database name:**
   - Add `/nuvix` (or your preferred database name) before the `?`

3. **Use proper query parameters:**
   - Replace `?appName=cluster17` with `?retryWrites=true&w=majority`

## Correct Format

Update your `Backend/.env` file:

```bash
MONGO_URI=mongodb+srv://nuvix_user:something%4017@cluster17.sb4rqbz.mongodb.net/nuvix?retryWrites=true&w=majority
```

## Quick URL Encoding Reference

Common special characters that need encoding:
- Space → `%20` or `+`
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `/` → `%2F`
- `:` → `%3A`
- `;` → `%3B`
- `=` → `%3D`
- `?` → `%3F`

## Online URL Encoder

You can use online tools like:
- https://www.urlencoder.org/
- https://www.urldecoder.org/

Or encode in Node.js:
```javascript
encodeURIComponent('something@17') // Returns: 'something%4017'
```
