# Design System

## Colors (Tailwind)
- **Primary**: blue-600 (main), blue-700 (hover), blue-50 (light bg)
- **Success**: green-600, green-50
- **Warning**: amber-500, amber-50
- **Danger**: red-600, red-50
- **Neutral**: gray-900 (text), gray-600 (muted), gray-100 (bg), white

## Typography
- h1: `text-2xl font-bold` (24px)
- h2: `text-xl font-bold` (20px)
- h3: `text-lg font-semibold` (18px)
- Body: `text-base` (16px)
- Small: `text-sm` (14px)

## Touch Optimization (Mandatory)
- Minimum touch target: **44×44px**
- Buttons sm: `min-h-[44px] px-4`
- Buttons md: `min-h-[44px] px-6`
- Buttons lg: `min-h-[52px] px-8`
- Buttons xl: `min-h-[60px] px-10`
- Input fields: `min-h-[44px]`

## UI Styling
- Border Radius: Cards/Buttons/Inputs `rounded-xl` (12px), Modals `rounded-2xl` (16px)
- Shadows: Cards `shadow-sm`, Elevated `shadow-lg`, Modals `shadow-2xl`
- Screen Sizes:
  - Mobile (<640px): Single column, bottom nav
  - Tablet (640–1024px): Two columns, collapsible sidebar (Primary Target)
  - Desktop (>1024px): Multi-column, permanent sidebar
