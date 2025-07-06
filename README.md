# Stateless SMS Verification (Proof of Concept)

Most phone verification flows look the same:
User enters phone number → Receives 6-digit code → Types it in → Verified.


It’s familiar, but also:

- Slow and error-prone  
- Vulnerable to phishing/SIM swaps  
- Unfriendly to modern UX patterns  

This repo explores a different approach using **stateless HMAC-based SMS verification** initiated by the user — no OTPs, no codes to intercept, no backend session tracking.

---

## How It Works

### 1. Generate Signature on the Server
- Signature is generated using an HMAC of the user’s number + randomly chosen destination number.
- No need to store anything on the server.

### 2. Create the Verification Link (or QR)

### 3. User Sends the SMS
- On mobile, they click the link or scan the QR
- SMS app opens pre-filled
- They press "Send" to send the message

### 4. Backend Verifies the Signature on Incoming SMS
- Incoming SMS is parsed for the signature
- The backend compares it with a freshly computed version
- If it matches: ✅ verified

--- 

# Why It’s Safer
- User-initiated: No SMS to intercept
- Random number: Makes spoofing harder
- Stateless: No DB session, no expiry to manage
- Signature tied to destination: Can't be reused elsewhere

---

# Limitations
- No retry logic
- No fallback
- No logging/auditing
- No expiration for signatures
- No rate limiting or abuse prevention
- Not GDPR/compliance reviewed

---

# FAQ
### “Isn't this just a weird OTP?”
Not exactly. It's not a replacement, but an alternate trust model:
- No code received
- Stateless backend
- Initiated by user

### “Won’t users get confused sending SMS?”
Some might. This isn’t for every product. But for device pairing or secure mobile flows, the interaction is very natural.

### “Why use SMS at all?”
Yes, SMS has flaws. But flipping the flow reduces attack surface. There's no inbound message to intercept, making phishing harder.

### “How would this scale?”
It won’t, yet. This is an exploration into a pattern. With retries, observability, and fallback handling, it could be made production-ready.

---
