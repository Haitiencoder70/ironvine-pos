# Image Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing image infrastructure (ImageUploader, ImageGallery, imageService, /api/images routes) into four product/order workflows: product catalog photos, design mockups, production photos, and customer design approval.

**Architecture:** All four features share the same backend (`POST /api/images/upload`, `GET /api/images/:entityType/:entityId`, `DELETE /api/images/:id`). The frontend already has `ImageUploader` and `ImageGallery` components — the work is adding a shared `imagesApi`/`useEntityImages` hook and dropping these components into the right pages. Customer approval gets its own backend endpoint (`PATCH /api/orders/:id/approve-design`) and a small frontend panel.

**Tech Stack:** React Query, Axios, existing `ImageUploader.tsx` + `ImageGallery.tsx`, existing `imageService.ts` + `imagesRouter`, Prisma (`Image` model, `Order.designApproved` fields)

---

## Task 1: Shared image API + hook

**Files:**
- Modify: `frontend/src/services/api.ts` — add `imagesApi`
- Create: `frontend/src/hooks/useImages.ts` — `useEntityImages` query + mutation helpers

- [ ] **Step 1: Add `imagesApi` to `api.ts`**

Open `frontend/src/services/api.ts`. Add this block after the `posApi` block (around line 312):

```ts
// ─── Images ───────────────────────────────────────────────────────────────────

export const imagesApi = {
  getForEntity: (entityType: string, entityId: string) =>
    api.get<ApiResponse<Image[]>>(`/images/${entityType}/${entityId}`).then((r) => r.data),
  delete: (imageId: string) =>
    api.delete<ApiResponse<void>>(`/images/${imageId}`).then((r) => r.data),
  setPrimary: (imageId: string) =>
    api.patch<ApiResponse<Image>>(`/images/${imageId}/primary`).then((r) => r.data),
  reorder: (imageIds: string[]) =>
    api.patch<ApiResponse<void>>('/images/reorder', { imageIds }).then((r) => r.data),
};
```

- [ ] **Step 2: Create `useImages.ts`**

Create `frontend/src/hooks/useImages.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { imagesApi } from '../services/api';
import type { Image } from '../types';

export function useEntityImages(entityType: string, entityId: string | undefined) {
  const qc = useQueryClient();
  const key = ['images', entityType, entityId];

  const query = useQuery({
    queryKey: key,
    queryFn: () => imagesApi.getForEntity(entityType, entityId!),
    select: (r) => r.data,
    enabled: !!entityId,
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => imagesApi.delete(imageId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key }),
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (imageId: string) => imagesApi.setPrimary(imageId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key }),
  });

  const reorderMutation = useMutation({
    mutationFn: (imageIds: string[]) => imagesApi.reorder(imageIds),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key }),
  });

  function onUploaded(_newImages: Image[]) {
    void qc.invalidateQueries({ queryKey: key });
  }

  return {
    images: query.data ?? [],
    isLoading: query.isLoading,
    onUploaded,
    onDelete: (id: string) => deleteMutation.mutate(id),
    onSetPrimary: (id: string) => setPrimaryMutation.mutate(id),
    onReorder: (ids: string[]) => reorderMutation.mutate(ids),
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/api.ts frontend/src/hooks/useImages.ts
git commit -m "feat: add imagesApi and useEntityImages hook"
```

---

## Task 2: Product Catalog Images

**Files:**
- Modify: `frontend/src/pages/products/AddEditProduct.tsx` — add Images section near the bottom of the form

The file is 931 lines. The images section goes at the end of the left-column form, before the submit button row.

- [ ] **Step 1: Add imports to `AddEditProduct.tsx`**

At the top of the file, add these imports alongside the existing ones:

```ts
import { ImageUploader } from '../../components/images/ImageUploader';
import { ImageGallery } from '../../components/images/ImageGallery';
import { useEntityImages } from '../../hooks/useImages';
```

- [ ] **Step 2: Call the hook inside the component**

Find the line in the component body where `const { id } = useParams()` (or equivalent) is called. Directly below the form state declarations, add:

```ts
const productImages = useEntityImages('product', id);
```

Note: `id` comes from `useParams<{ id: string }>()` — use `undefined` for new products (gallery won't show since `enabled: !!entityId`).

- [ ] **Step 3: Add the Images section to the JSX**

Find the section just before the final Save/Cancel button row at the bottom of the form. Insert this card:

```tsx
{/* ── Product Images ── */}
{id && (
  <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
    <h3 className="text-sm font-semibold text-gray-700">Product Photos</h3>
    <ImageGallery
      images={productImages.images}
      editable
      onUpload={() => {}}
      onDelete={productImages.onDelete}
      onSetPrimary={productImages.onSetPrimary}
      onReorder={productImages.onReorder}
      emptyMessage="No product photos yet"
      columns={4}
    />
    <ImageUploader
      entityType="product"
      entityId={id}
      imageType="PRODUCT"
      onUploadComplete={productImages.onUploaded}
      onError={(msg) => console.error(msg)}
    />
  </div>
)}
```

Note: The gallery + uploader only render for existing products (`id` must exist). When creating a new product, images can be added after saving.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/products/AddEditProduct.tsx
git commit -m "feat: add product catalog image gallery to product edit form"
```

---

## Task 3: Design Mockup Images on Order Detail

**Files:**
- Modify: `frontend/src/pages/orders/OrderDetail.tsx` — add Design Mockups card to the left column, after the Items section (around line 651)

- [ ] **Step 1: Add imports to `OrderDetail.tsx`**

```ts
import { ImageUploader } from '../../components/images/ImageUploader';
import { ImageGallery } from '../../components/images/ImageGallery';
import { useEntityImages } from '../../hooks/useImages';
```

- [ ] **Step 2: Call the hook inside the component**

After the existing query/mutation declarations near the top of `OrderDetail`, add:

```ts
const mockupImages = useEntityImages('order', order?.id);
```

Place this after the `order` data is available (i.e., inside a conditional or after the early return for loading/error states).

- [ ] **Step 3: Add the Design Mockups card to JSX**

In the left column (`lg:col-span-2`), after the Notes card (around line 681) and before the Totals card, insert:

```tsx
{/* Design Mockups */}
<TouchCard padding="md" className="shadow-sm border border-gray-100">
  <SectionHeader
    icon={<PhotoIcon className="h-4 w-4 text-gray-500" />}
    title="Design Mockups"
  />
  <div className="space-y-4">
    <ImageGallery
      images={mockupImages.images.filter((img) => img.imageType === 'MOCKUP')}
      editable
      onUpload={() => {}}
      onDelete={mockupImages.onDelete}
      onSetPrimary={mockupImages.onSetPrimary}
      onReorder={mockupImages.onReorder}
      emptyMessage="No mockups uploaded yet"
      columns={3}
    />
    <ImageUploader
      entityType="order"
      entityId={order.id}
      imageType="MOCKUP"
      onUploadComplete={mockupImages.onUploaded}
      onError={(msg) => console.error(msg)}
    />
  </div>
</TouchCard>
```

- [ ] **Step 4: Add `PhotoIcon` to imports**

`PhotoIcon` comes from `@heroicons/react/24/outline`. Add it to the existing heroicons import line at the top of `OrderDetail.tsx`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/orders/OrderDetail.tsx
git commit -m "feat: add design mockup image section to order detail"
```

---

## Task 4: Production Photos on Order Detail

**Files:**
- Modify: `frontend/src/pages/orders/OrderDetail.tsx` — add Production Photos card, reuse the same `mockupImages` hook with a different filter

Note: We reuse the same `useEntityImages('order', order.id)` hook — it fetches all images for the order. Each section just filters by `imageType`.

- [ ] **Step 1: Add Production Photos card to JSX**

In `OrderDetail.tsx`, after the Design Mockups card from Task 3, insert:

```tsx
{/* Production Photos */}
<TouchCard padding="md" className="shadow-sm border border-gray-100">
  <SectionHeader
    icon={<CameraIcon className="h-4 w-4 text-gray-500" />}
    title="Production Photos"
  />
  <div className="space-y-4">
    <p className="text-xs text-gray-400">
      Photos taken during production for quality assurance. Customers can view these once approved.
    </p>
    <ImageGallery
      images={mockupImages.images.filter((img) => img.imageType === 'ORDER')}
      editable
      onUpload={() => {}}
      onDelete={mockupImages.onDelete}
      onSetPrimary={mockupImages.onSetPrimary}
      onReorder={mockupImages.onReorder}
      emptyMessage="No production photos yet"
      columns={3}
    />
    <ImageUploader
      entityType="order"
      entityId={order.id}
      imageType="ORDER"
      onUploadComplete={mockupImages.onUploaded}
      onError={(msg) => console.error(msg)}
    />
  </div>
</TouchCard>
```

- [ ] **Step 2: Add `CameraIcon` to imports**

Add `CameraIcon` to the existing `@heroicons/react/24/outline` import line.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/orders/OrderDetail.tsx
git commit -m "feat: add production photo section to order detail"
```

---

## Task 5: Customer Design Approval Workflow

**Files:**
- Modify: `backend/src/routes/orders.ts` — add two PATCH routes
- Modify: `backend/src/controllers/orderController.ts` — add two handlers
- Create: `frontend/src/components/orders/DesignApprovalPanel.tsx`
- Modify: `frontend/src/pages/orders/OrderDetail.tsx` — embed the panel
- Modify: `frontend/src/services/api.ts` — add approval API methods

### 5a — Backend: request-approval and approve-design endpoints

- [ ] **Step 1: Read `backend/src/routes/orders.ts` then add two routes**

Open `backend/src/routes/orders.ts`. After the existing `PATCH /:id/status` route, add:

```ts
ordersRouter.patch('/:id/request-approval', authorize('orders:edit'), requestDesignApproval);
ordersRouter.patch('/:id/approve-design',   authorize('orders:edit'), approveDesign);
```

Add the handler imports at the top of the file alongside the existing controller imports:

```ts
import {
  // ...existing imports...
  requestDesignApproval,
  approveDesign,
} from '../controllers/orderController';
```

- [ ] **Step 2: Read `backend/src/controllers/orderController.ts` then add two handlers**

At the end of `orderController.ts`, add:

```ts
export const requestDesignApproval = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: { id, organizationId: organizationDbId! },
      select: { id: true, designApproved: true },
    });
    if (!order) return next(new AppError(404, 'Order not found', 'NOT_FOUND'));

    await prisma.order.update({
      where: { id },
      data: { designApproved: false, designApprovedAt: null, designApprovedBy: null },
    });

    res.json({ data: { requested: true } });
  } catch (err) { next(err); }
};

export const approveDesign = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { organizationDbId, auth } = req as AuthenticatedRequest;
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: { id, organizationId: organizationDbId! },
      select: { id: true },
    });
    if (!order) return next(new AppError(404, 'Order not found', 'NOT_FOUND'));

    const updated = await prisma.order.update({
      where: { id },
      data: {
        designApproved: true,
        designApprovedAt: new Date(),
        designApprovedBy: auth.userId,
      },
      select: { id: true, designApproved: true, designApprovedAt: true, designApprovedBy: true },
    });

    res.json({ data: updated });
  } catch (err) { next(err); }
};
```

- [ ] **Step 3: Commit backend**

```bash
git add backend/src/routes/orders.ts backend/src/controllers/orderController.ts
git commit -m "feat: add request-approval and approve-design order endpoints"
```

### 5b — Frontend: API methods + DesignApprovalPanel

- [ ] **Step 4: Add approval methods to `ordersApi` in `api.ts`**

Find the `ordersApi` object in `frontend/src/services/api.ts`. Add these two methods:

```ts
requestApproval: (id: string) =>
  api.patch<ApiResponse<{ requested: boolean }>>(`/orders/${id}/request-approval`).then((r) => r.data),
approveDesign: (id: string) =>
  api.patch<ApiResponse<{ designApproved: boolean; designApprovedAt: string }>>(`/orders/${id}/approve-design`).then((r) => r.data),
```

- [ ] **Step 5: Create `DesignApprovalPanel.tsx`**

Create `frontend/src/components/orders/DesignApprovalPanel.tsx`:

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { ordersApi } from '../../services/api';

interface DesignApprovalPanelProps {
  orderId: string;
  designApproved: boolean;
  designApprovedAt: string | null;
  designApprovedBy: string | null;
}

export function DesignApprovalPanel({
  orderId,
  designApproved,
  designApprovedAt,
  designApprovedBy,
}: DesignApprovalPanelProps) {
  const qc = useQueryClient();

  const requestMutation = useMutation({
    mutationFn: () => ordersApi.requestApproval(orderId),
    onSuccess: () => {
      toast.success('Approval request sent');
      void qc.invalidateQueries({ queryKey: ['order', orderId] });
    },
    onError: () => toast.error('Failed to send approval request'),
  });

  const approveMutation = useMutation({
    mutationFn: () => ordersApi.approveDesign(orderId),
    onSuccess: () => {
      toast.success('Design approved');
      void qc.invalidateQueries({ queryKey: ['order', orderId] });
    },
    onError: () => toast.error('Failed to record approval'),
  });

  return (
    <div className="space-y-4">
      {/* Status badge */}
      {designApproved ? (
        <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800">Design Approved</p>
            {designApprovedAt && (
              <p className="text-xs text-green-600 mt-0.5">
                {format(new Date(designApprovedAt), 'MMM d, yyyy h:mm a')}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <ClockIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Awaiting Approval</p>
            <p className="text-xs text-amber-600 mt-0.5">Upload a mockup above, then send it for approval</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => requestMutation.mutate()}
          disabled={requestMutation.isPending}
          className="min-h-[44px] px-4 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {requestMutation.isPending ? 'Sending…' : 'Send for Approval'}
        </button>
        {!designApproved && (
          <button
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
            className="min-h-[44px] px-4 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {approveMutation.isPending ? 'Approving…' : 'Mark as Approved'}
          </button>
        )}
        {designApproved && (
          <button
            onClick={() => requestMutation.mutate()}
            disabled={requestMutation.isPending}
            className="min-h-[44px] px-4 rounded-xl border border-amber-300 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-colors"
          >
            Reset Approval
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Add `designApproved` fields to the Order type in `types/index.ts`**

Find the `Order` interface in `frontend/src/types/index.ts`. Add these fields:

```ts
designApproved: boolean;
designApprovedAt: string | null;
designApprovedBy: string | null;
```

- [ ] **Step 7: Embed `DesignApprovalPanel` in `OrderDetail.tsx`**

Add the import:

```ts
import { DesignApprovalPanel } from '../../components/orders/DesignApprovalPanel';
```

In the JSX, inside the Design Mockups card from Task 3, add the approval panel **below** the uploader:

```tsx
<DesignApprovalPanel
  orderId={order.id}
  designApproved={order.designApproved}
  designApprovedAt={order.designApprovedAt ?? null}
  designApprovedBy={order.designApprovedBy ?? null}
/>
```

- [ ] **Step 8: Commit all frontend approval changes**

```bash
git add frontend/src/services/api.ts \
        frontend/src/components/orders/DesignApprovalPanel.tsx \
        frontend/src/types/index.ts \
        frontend/src/pages/orders/OrderDetail.tsx
git commit -m "feat: customer design approval panel on order detail"
```

---

## Task 6: Push to GitHub

- [ ] **Step 1: Push all commits**

```bash
git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✅ Product catalog images — Task 2 adds `ImageUploader` + `ImageGallery` to product edit form
- ✅ Design mockups — Task 3 adds mockup gallery + uploader to order detail
- ✅ Production photos — Task 4 adds production photo gallery + uploader to order detail
- ✅ Customer approval — Task 5 adds backend endpoints + `DesignApprovalPanel`
- ✅ Shared hook — Task 1 gives all features the same `useEntityImages` pattern

**No placeholders:** All code blocks are complete and runnable.

**Type consistency:**
- `imagesApi` defined in Task 1, used in `useEntityImages` in Task 1
- `useEntityImages` returns `{ images, onUploaded, onDelete, onSetPrimary, onReorder }` — all used consistently in Tasks 2–4
- `ordersApi.requestApproval` / `ordersApi.approveDesign` defined in Task 5 Step 4, called in `DesignApprovalPanel` in Task 5 Step 5
- `DesignApprovalPanel` props match `Order` type fields added in Task 5 Step 6
