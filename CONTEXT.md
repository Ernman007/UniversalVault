# UniversalVault Banking Platform

The core banking domain for UniversalVault. Covers how users move money between accounts, how those movements are tracked, and what each party sees at each stage of the process.

## Language

### Money movement

**Transfer Request**:
An instruction from a user to move money from one of their accounts to another account. It has its own lifecycle (pending → pending_admin → approved/rejected/expired) and always links to exactly one Transaction.
_Avoid_: Transfer, payment request, transaction request

**Transaction**:
The permanent ledger record of a money movement. Created at the moment a Transfer Request is initiated. Holds the authoritative status of whether money has settled.
_Avoid_: Transfer, record, entry

**Reserve**:
The act of deducting the transfer amount from the sender's available balance at the moment a Transfer Request is created, before verification or bank approval. Prevents double-spending. If the Transfer Request is later cancelled or expires, the reserved amount is refunded.
_Avoid_: Hold, freeze, lock

**Confirm**:
The act of settling a Transaction — crediting the receiver's account. Happens only after the sender has verified via OTP and the bank has approved. A confirmed Transaction is final.
_Avoid_: Complete, finalise, approve (approval is a step toward confirmation, not the same thing)

**Cancel**:
The automatic reversal of a reserved Transaction when a Transfer Request expires. Refunds the sender's reserved amount. Distinct from Reject, which is a deliberate bank decision.
_Avoid_: Expire (expiry of the request triggers a cancellation of the transaction, they are not the same)

**Reject**:
A deliberate bank decision to decline a Transfer Request that has passed OTP verification. Refunds the sender's reserved amount and closes the request permanently.
_Avoid_: Deny, decline, cancel

### Lifecycle states (Transfer Request)

**Awaiting Verification**:
The Transfer Request has been created and an OTP has been sent. The sender has not yet entered the code. Corresponds to `TransferRequest.status = "pending"`.
_Avoid_: Pending (too vague — use only as a code-level status, not in UI copy)

**Awaiting Bank Approval**:
The sender has verified via OTP. The bank has not yet approved or rejected the request. Corresponds to `TransferRequest.status = "pending_admin"`.
_Avoid_: Awaiting admin approval, in review

### Roles

**Sender**:
The user who initiates a Transfer Request from their own account. Their balance is reserved immediately on creation.
_Avoid_: Payer, source user

**Receiver**:
The account holder whose account will be credited if a Transaction is confirmed. Has no visibility of a Transfer Request or its linked Transaction until the Transaction is confirmed.
_Avoid_: Recipient, payee, destination user

### Visibility rules

**Sender visibility**:
Senders see their outgoing Transaction in their transaction list from the moment it is created, with a status label reflecting where it is in the Transfer Request lifecycle. Pending outgoing transactions count toward the sender's monthly expense summary.

**Receiver visibility**:
Receivers see an incoming Transaction only after it reaches `confirmed` status. Unconfirmed incoming transactions are excluded from both their transaction list and their monthly income summary.

---

## Example dialogue

> **Dev**: "The receiver's dashboard showed a +$30 entry even though the transfer was still pending. Should we filter that?"
>
> **Domain expert**: "Yes. The receiver has no visibility until the Transaction is confirmed. They never see a Transfer Request at all — only the settled Transaction."
>
> **Dev**: "What if the sender abandons the OTP flow — does the money stay out of their balance?"
>
> **Domain expert**: "The amount is reserved the moment they create the Transfer Request. If the OTP expires, the system automatically cancels the Transaction and refunds the reservation. It doesn't wait for the bank to do it manually."
>
> **Dev**: "So 'cancel' and 'reject' are different things?"
>
> **Domain expert**: "Yes. Cancel is automatic — triggered by expiry. Reject is a deliberate bank decision after the sender has already verified."
