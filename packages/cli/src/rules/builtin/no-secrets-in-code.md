---
title: No Secrets in Code
impact: CRITICAL
tags: [security, secrets, credentials]
category: security
trigger:
  always: true
---

## No Secrets in Code

**Impact: CRITICAL**

Never commit secrets, API keys, tokens, passwords, or credentials to source code.

**Rules:**
- Use environment variables or secret management services
- Add secret patterns to `.gitignore` and `.env.example`
- Never log secrets, even in debug mode
- Rotate any secret that was ever committed, even if the commit was reverted
- Use `.env.example` with placeholder values, never real credentials

**Detection patterns to watch for:**
- Hardcoded strings that look like tokens (base64, hex, long random strings)
- Connection strings with embedded passwords
- Private keys or certificates inline
- `password = "..."` or `apiKey = "..."` assignments
