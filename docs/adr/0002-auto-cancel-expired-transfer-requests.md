# Expired Transfer Requests are automatically cancelled and the sender is refunded

When a Transfer Request expires (OTP timeout or pending_admin timeout), the system automatically cancels the linked Transaction and refunds the reserved amount to the sender — rather than waiting for a bank administrator to manually reject it. This prevents indefinite balance holds caused by abandoned OTP flows and keeps the system self-healing. The distinction between Cancel (automatic, triggered by expiry) and Reject (deliberate bank decision) is preserved in the Transaction status.
