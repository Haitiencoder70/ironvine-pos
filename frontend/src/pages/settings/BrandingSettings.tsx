import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import CodeMirror from '@uiw/react-codemirror';
import { css } from '@codemirror/lang-css';
import {
  PhotoIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  LockClosedIcon,
  PaintBrushIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../lib/api';
import { usePlanLimits } from '../../hooks/usePlanLimits';
import type { OrgBranding } from '../../hooks/useBranding';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrandingFormState {
  primaryColor:     string;
  secondaryColor:   string;
  emailFromName:    string;
  emailFromAddress: string;
  customCSS:        string;
  customDomain:     string;
}

const DEFAULTS: BrandingFormState = {
  primaryColor:     '#2563eb',
  secondaryColor:   '#64748b',
  emailFromName:    '',
  emailFromAddress: '',
  customCSS:        '',
  customDomain:     '',
};

// ─── Asset uploader ───────────────────────────────────────────────────────────

function AssetUploader({
  label,
  currentUrl,
  accept,
  uploadEndpoint,
  onUploaded,
  previewSize = 48,
}: {
  label: string;
  currentUrl: string | null;
  accept: string;
  uploadEndpoint: string;
  onUploaded: (url: string) => void;
  previewSize?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ data: { url: string } }>(uploadEndpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(res.data.data.url);
      toast.success(`${label} uploaded`);
    } catch {
      toast.error(`Failed to upload ${label.toLowerCase()}`);
    } finally {
      setUploading(false);
    }
  }, [uploadEndpoint, label, onUploaded]);

  return (
    <div className="flex items-center gap-4">
      <div
        className="flex-shrink-0 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden"
        style={{ width: previewSize * 2, height: previewSize }}
      >
        {currentUrl ? (
          <img src={currentUrl} alt={label} className="max-h-full max-w-full object-contain p-1" />
        ) : (
          <PhotoIcon className="h-6 w-6 text-gray-300" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <ArrowUpTrayIcon className="h-4 w-4" />
          {uploading ? 'Uploading…' : `Upload ${label}`}
        </button>
        {currentUrl && (
          <button
            type="button"
            onClick={() => onUploaded('')}
            className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
          >
            <TrashIcon className="h-4 w-4" />
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Upgrade gate ─────────────────────────────────────────────────────────────

function BrandingUpgradeGate() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-blue-50 p-4 mb-4">
        <LockClosedIcon className="h-8 w-8 text-blue-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">White-Label Branding</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">
        Customize your logo, colors, favicon, and email branding. Available on PRO and ENTERPRISE plans.
      </p>
      <a
        href="/settings?tab=billing"
        className="inline-flex items-center gap-2 min-h-[44px] px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
      >
        Upgrade to PRO
      </a>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BrandingSettings() {
  const queryClient = useQueryClient();
  const { canUseBranding, canUseCustomDomain } = usePlanLimits();

  const { data: branding, isLoading } = useQuery<OrgBranding>({
    queryKey: ['branding'],
    queryFn: async () => {
      const res = await api.get<{ data: OrgBranding }>('/branding');
      return res.data.data;
    },
  });

  const [synced, setSynced] = useState(false);
  const [form, setForm] = useState<BrandingFormState>(DEFAULTS);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);

  // Sync form state once branding loads
  if (branding && !synced) {
    setForm({
      primaryColor:     branding.primaryColor     ?? DEFAULTS.primaryColor,
      secondaryColor:   branding.secondaryColor   ?? DEFAULTS.secondaryColor,
      emailFromName:    branding.emailFromName     ?? '',
      emailFromAddress: branding.emailFromAddress ?? '',
      customCSS:        branding.customCSS        ?? '',
      customDomain:     branding.customDomain     ?? '',
    });
    setLogoUrl(branding.logoUrl);
    setFaviconUrl(branding.faviconUrl);
    setSynced(true);
  }

  const saveMutation = useMutation({
    mutationFn: async (data: BrandingFormState) => {
      await api.put('/branding', data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['branding'] });
      toast.success('Branding saved');
    },
    onError: () => {
      toast.error('Failed to save branding');
    },
  });

  const handleColorChange = (field: 'primaryColor' | 'secondaryColor', value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    const cssVar = field === 'primaryColor' ? '--color-primary' : '--color-secondary';
    document.documentElement.style.setProperty(cssVar, value);
  };

  const handleRestoreDefaults = () => {
    const restored = { ...form, primaryColor: DEFAULTS.primaryColor, secondaryColor: DEFAULTS.secondaryColor, customCSS: '' };
    setForm(restored);
    document.documentElement.style.setProperty('--color-primary',   DEFAULTS.primaryColor);
    document.documentElement.style.setProperty('--color-secondary', DEFAULTS.secondaryColor);
    void saveMutation.mutateAsync(restored);
  };

  if (!canUseBranding) return <BrandingUpgradeGate />;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <PaintBrushIcon className="h-6 w-6 text-gray-400" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Branding</h2>
          <p className="text-sm text-gray-500">Customize how your POS looks and feels.</p>
        </div>
      </div>

      {/* Logo */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Logo</h3>
        <AssetUploader
          label="Logo"
          currentUrl={logoUrl}
          accept="image/png,image/jpeg,image/svg+xml"
          uploadEndpoint="/branding/upload-logo"
          onUploaded={(url) => {
            setLogoUrl(url || null);
            void queryClient.invalidateQueries({ queryKey: ['branding'] });
          }}
          previewSize={48}
        />
        <p className="text-xs text-gray-400">PNG, JPG, or SVG. Max 2 MB. Recommended: 200×60px.</p>
      </section>

      {/* Favicon */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Favicon</h3>
        <AssetUploader
          label="Favicon"
          currentUrl={faviconUrl}
          accept="image/png,image/x-icon"
          uploadEndpoint="/branding/upload-favicon"
          onUploaded={(url) => {
            setFaviconUrl(url || null);
            void queryClient.invalidateQueries({ queryKey: ['branding'] });
          }}
          previewSize={32}
        />
        <p className="text-xs text-gray-400">PNG or ICO. Max 512 KB. Recommended: 32×32px.</p>
      </section>

      {/* Colors */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Brand Colors</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Primary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                className="h-11 w-11 rounded-lg border border-gray-300 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={form.primaryColor}
                onChange={(e) => {
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                    handleColorChange('primaryColor', e.target.value);
                  }
                }}
                className="flex-1 min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono"
                placeholder="#2563eb"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Secondary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.secondaryColor}
                onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                className="h-11 w-11 rounded-lg border border-gray-300 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={form.secondaryColor}
                onChange={(e) => {
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                    handleColorChange('secondaryColor', e.target.value);
                  }
                }}
                className="flex-1 min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono"
                placeholder="#64748b"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Email Branding */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Email Branding</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">From Name</label>
            <input
              type="text"
              value={form.emailFromName}
              onChange={(e) => setForm((f) => ({ ...f, emailFromName: e.target.value }))}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 text-sm"
              placeholder="Acme Printing"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">From Address</label>
            <input
              type="email"
              value={form.emailFromAddress}
              onChange={(e) => setForm((f) => ({ ...f, emailFromAddress: e.target.value }))}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 text-sm"
              placeholder="orders@acmeprinting.com"
            />
            <p className="text-xs text-gray-400">Must be a verified sender in your Resend dashboard.</p>
          </div>
        </div>
      </section>

      {/* Custom CSS */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Custom CSS</h3>
        <p className="text-xs text-gray-400">Advanced: inject CSS into the app. Changes apply after Save.</p>
        <div className="rounded-lg border border-gray-300 overflow-hidden">
          <CodeMirror
            value={form.customCSS}
            height="200px"
            extensions={[css()]}
            onChange={(value) => setForm((f) => ({ ...f, customCSS: value }))}
            theme="light"
          />
        </div>
      </section>

      {/* Custom Domain — ENTERPRISE only */}
      {canUseCustomDomain && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Custom Domain</h3>
          <input
            type="text"
            value={form.customDomain}
            onChange={(e) => setForm((f) => ({ ...f, customDomain: e.target.value }))}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 text-sm"
            placeholder="pos.acmeprinting.com"
          />
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800 space-y-1">
            <p className="font-semibold">DNS Setup Instructions</p>
            <p>Add a CNAME record pointing your domain to your app subdomain, then contact support to provision SSL.</p>
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => void saveMutation.mutateAsync(form)}
          disabled={saveMutation.isPending}
          className="min-h-[44px] px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={handleRestoreDefaults}
          disabled={saveMutation.isPending}
          className="min-h-[44px] px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Restore Defaults
        </button>
      </div>
    </div>
  );
}
