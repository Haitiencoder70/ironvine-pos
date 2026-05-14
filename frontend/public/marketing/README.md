# PrintFlow POS -- Marketing Assets

The landing page (`LandingPage.tsx`) expects the files below.
Missing files are handled gracefully -- placeholder cards render instead.

## Screenshots Needed

| Filename                       | Screen            | What to capture                                              |
| ------------------------------ | ----------------- | ------------------------------------------------------------ |
| `screenshot-dashboard.png`     | Dashboard         | Stats cards (orders today, revenue, in-production), recent orders list, low-stock alerts |
| `screenshot-orders.png`        | Orders list       | Several orders with mixed statuses, search bar, filters visible |
| `screenshot-order-detail.png`  | Order detail      | Status timeline, line items (sizes/colors/print method), materials section |
| `screenshot-inventory.png`     | Inventory         | Stock table with qty, low-stock rows highlighted, category filters |
| `screenshot-production.png`    | Production board  | Jobs in queue / printing / done columns or list with status badges |

## Optional Video

| Filename                  | Description                                |
| ------------------------- | ------------------------------------------ |
| `printflow-demo-60s.mp4`  | 60-second product walkthrough (see script below) |
| `demo-poster.png`         | Video poster frame -- use dashboard screenshot or a branded title card |

## Capture Instructions

### Browser Setup

1. Use Chrome DevTools device toolbar (Ctrl+Shift+M).
2. Set viewport to **1280 x 800** (landscape tablet -- primary target).
3. Set device pixel ratio to **2x** for retina-quality output.
4. Use a clean demo org with sample data (see below).

### Demo Data Checklist

Seed the demo org with fictional data only -- no real customer info.

- **Customers**: Acme Corp, Wayne Enterprises, Stark Industries, Daily Planet
- **Orders**: 8-12 orders across all statuses (Quote through Completed), mix of Rush/Normal priority
- **Line items**: T-shirts, hoodies, polos; DTF, screen print, HTV, embroidery; multiple sizes/colors
- **Inventory**: Blanks (black, white, navy, grey), DTF film rolls, vinyl sheets, ink; some below reorder point
- **Purchase orders**: 2-3 POs in different statuses
- **Shipments**: 1-2 with tracking numbers

### Taking the Screenshots

1. Log into the demo org at `pos.printflowpos.com`.
2. Navigate to each screen listed above.
3. Screenshot the **full viewport** (Ctrl+Shift+P → "Capture screenshot" in DevTools).
4. Crop browser chrome -- only the app content inside the viewport.
5. Save as PNG, optimise with `pngquant` or similar (target < 300 KB each).
6. Place files in `frontend/public/marketing/`.

### Recommended Sizes

| Asset               | Dimensions (px) | Notes                            |
| -------------------- | --------------- | -------------------------------- |
| Featured screenshot  | 2560 x 1600     | 2x of 1280x800 viewport         |
| Secondary screenshots| 2560 x 1600     | Same capture, displayed smaller  |
| Demo poster          | 2560 x 1600     | Match video aspect ratio         |
| Video                | 1920 x 1080     | 30fps, H.264, < 15 MB           |

## 60-Second Demo Video Script

### Storyboard

| Time      | Screen         | Action / Narration                                                       |
| --------- | -------------- | ------------------------------------------------------------------------ |
| 0:00-0:05 | Title card     | "PrintFlow POS -- From quote to shipped in one workflow."                |
| 0:05-0:15 | Dashboard      | "Here's your dashboard. Today's orders, revenue, what's in production, and low-stock alerts -- all at a glance." |
| 0:15-0:25 | New Order      | "A customer calls in. Create a quote: pick the customer, add items -- 50 black tees, DTF front print -- set the due date, done." |
| 0:25-0:32 | Order Detail   | "Approve the order. PrintFlow knows what materials you need and creates a purchase order automatically." |
| 0:32-0:38 | Inventory      | "When blanks arrive, receive them in one tap. Stock updates, and the order moves to production." |
| 0:38-0:45 | Production     | "Your production board shows what's printing, what's waiting, and what's rush. Nothing gets lost." |
| 0:45-0:52 | Shipping       | "Job's done -- create a shipment, add tracking, and the customer gets notified."                |
| 0:52-0:60 | CTA card       | "PrintFlow POS. Try it free for 14 days at printflowpos.com."           |

### Recording Tips

- Use a screen recorder (OBS, Loom, or ScreenFlow) at 1920x1080 30fps.
- Hide bookmarks bar and extensions for a clean look.
- Use slow, deliberate mouse movements -- no frantic clicking.
- Add subtle zoom transitions between screens if editing (optional).
- Background music: lo-fi or upbeat instrumental, low volume.
- Export as H.264 MP4, target < 15 MB.
