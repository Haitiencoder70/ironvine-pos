# Compliance & Privacy

## GDPR Compliance

### Data Collected
- **Account data**: name, email, organization name (via Clerk)
- **Business data**: orders, customers, inventory (stored in PostgreSQL)
- **Usage data**: feature usage metrics, billing events
- **Support data**: messages sent via Intercom (if enabled)

### User Rights
- **Access**: Users can export their organization's data via Settings → Data Export
- **Rectification**: Users can update personal data in Settings → Profile
- **Erasure**: Organization owners can delete their account; all data purged within 30 days
- **Portability**: JSON export available per organization
- **Objection**: Contact support@[yourdomain].com

### Data Retention
- Active organization data: retained while subscription is active
- Cancelled accounts: 30-day grace period, then purged
- Audit logs: 12 months
- Billing history: 7 years (legal requirement)

### Sub-processors
| Processor    | Purpose              | Location |
|--------------|----------------------|----------|
| Neon         | Database hosting     | US-East  |
| Clerk        | Authentication       | US       |
| Stripe       | Payment processing   | US       |
| Resend       | Transactional email  | US       |
| Vercel       | Hosting & CDN        | Global   |
| Sentry       | Error monitoring     | US       |

## Data Processing Agreement
Enterprise customers may request a Data Processing Agreement (DPA).
Contact: support@[yourdomain].com

## Security
- Data encrypted in transit (TLS 1.2+)
- Data encrypted at rest (AES-256 via Neon/Vercel)
- Access controls: role-based (OWNER, ADMIN, MANAGER, STAFF)
- Audit logging: all destructive operations logged

## Cookie Policy
- **Strictly necessary**: Clerk session cookie (cannot opt out)
- **Analytics**: optional, controlled by cookie consent banner
- No third-party advertising cookies

## Contact
Data Controller: [Your Company Name]
Email: privacy@[yourdomain].com
