
## Email verification code (optional)
The "change Master Password" screen can require a 6-digit code emailed to the owner. It needs the two functions in `/api` and these Vercel environment variables (Project > Settings > Environment Variables):

- `RESEND_API_KEY` : API key from resend.com
- `MAIL_FROM` : e.g. `PassFast <onboarding@resend.dev>` (or an address on your verified domain)
- `OWNER_EMAIL` : the address that receives the code. With `onboarding@resend.dev` this must be your own Resend account email.
- `CODE_SECRET` : any long random string

The code is always sent to `OWNER_EMAIL`, never to an address typed by the visitor. Redeploy after adding variables.

## Files
- `index.html` : page structure
- `style.css` : all styles
- `main.js` : main app (vault, encryption, voice)
- `recovery.js` : phone OTP register + recovery
- `features.js` : language engine, About, voice actions, backup, reset, email code
- `api/` : optional email-code functions (Vercel)
- `404.html`, `robots.txt`, `sitemap.xml`, `og-image.jpg`, `vercel.json`

## Phone OTP (register + forgot password)
Flow: first launch -> mobile number -> SMS OTP -> Master Password. Recovery is ON from the start. If the password is forgotten: mobile number -> SMS OTP -> NEW Master Password. The data stays.

Limits to know:
- The recovery copy lives in the same browser. Clearing browser data deletes it, so also keep a Backup.
- Anyone who can read SMS on that number can recover the vault. Protect the SIM.
- If you change `CODE_SECRET` later, existing recoveries stop working.
- Existing vaults: Settings > Phone Recovery > verify the number once to turn it on.
- Without the SMS service configured (e.g. the Claude preview) the register screen shows a "continue without phone" button.

Setup (Twilio):
1. Create a Twilio account, buy/enable an SMS-capable number or a Messaging Service. For Indian numbers, India's DLT rules apply: a trial account only texts verified numbers, and production SMS to India needs DLT registration.
2. Vercel > Settings > Environment Variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` (or `TWILIO_MESSAGING_SID`), `CODE_SECRET` (long random string). Redeploy.
3. The built-in rate limit (5 OTPs per number/hour, 20 per IP/hour) is per serverless instance. For real protection against SMS-cost abuse also use Vercel Firewall rate limiting.

## Jarvis voice + AI conversation
- Tap the mic once: Jarvis listens, answers aloud, and listens again (hands-free). Say "bas" / "ruko" / "stop" to end. Three silences in a row also end it.
- Commands (show/copy/edit/delete password, add, lock, theme, settings...) run on-device and need no internet service.
- Open conversation ("kaise ho", general questions) needs the AI function `api/jarvis.js`:
  Vercel > Environment Variables: `ANTHROPIC_API_KEY` (and optionally `JARVIS_MODEL`, default `claude-haiku-5-5`). Redeploy.
  Only the sentence and a few earlier turns are sent. Passwords, usernames and account names are never sent. Users can switch it off in Settings > Mic.
- Set a monthly spend limit for the key in the Anthropic console. Built-in limit: 40 questions per IP per hour (per serverless instance).
- Voice input needs Chrome or Edge (desktop/Android) on https. iPhone Safari support is limited. Firefox has no voice input.
