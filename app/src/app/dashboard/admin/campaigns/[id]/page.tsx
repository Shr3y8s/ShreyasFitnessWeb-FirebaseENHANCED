'use client';

// Marketing Campaigns — admin editor / detail page (Phase 1).
//
// Handles both creating (`/campaigns/new`) and editing/sending an existing
// campaign (`/campaigns/{id}`). While status === 'draft' the form is editable
// and recipients can be managed; once sent, the page becomes a read-only
// results view. See docs/02-implementation/marketing-campaigns/design.md.

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Loader2,

  Send,
  Save,
  Mail,
  Eye,
  Users,
  CheckCircle2,
  XCircle,
  Ban,
  AlertTriangle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AdminSidebar from '@/components/AdminSidebar';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useAuth } from '@/lib/auth-context';
import { CAMPAIGN_PRESETS, getPreset } from '@/lib/campaign-presets';



import {
  getCampaign,
  createCampaign,
  updateCampaign,
  listRecipients,
  setRecipients,
  parseEmailList,
  sendCampaign,
  sendCampaignTest,
  previewCampaign,
  listActiveDiscountCodes,
  type DiscountCodeOption,
} from '@/lib/campaigns-api';

import type {
  Campaign,
  CampaignRecipient,
  CampaignTemplate,
  CtaTarget,
  RecipientStatus,
  RecipientInput,
} from '@/types/campaigns';


const RECIPIENT_STATUS_STYLES: Record<RecipientStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  suppressed: 'bg-amber-100 text-amber-700',
};

const DEFAULT_TEMPLATE: CampaignTemplate = {
  headline: 'You’re invited to explore SHREY.FIT',
  body:
    'We’re opening the doors to personalized coaching, structured training, and nutrition guidance. Come take a look and join us.',
  ctaLabel: 'Explore & Join',
  ctaTarget: 'signup',
};

export default function CampaignEditorPage() {
  const router = useRouter();
  const params = useParams();
  const { userData } = useAuth();
  const rawId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);
  const isNew = rawId === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [recipients, setRecipientsState] = useState<CampaignRecipient[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [headline, setHeadline] = useState(DEFAULT_TEMPLATE.headline);
  const [body, setBody] = useState(DEFAULT_TEMPLATE.body);
  const [ctaLabel, setCtaLabel] = useState(DEFAULT_TEMPLATE.ctaLabel);
  const [ctaTarget, setCtaTarget] = useState<CtaTarget>(DEFAULT_TEMPLATE.ctaTarget);
  const [emailBlock, setEmailBlock] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');

  // Active discount codes for the code dropdowns (campaign-level + per-recipient).
  const [activeCodes, setActiveCodes] = useState<DiscountCodeOption[]>([]);
  // Per-recipient code overrides chosen via the dropdowns, keyed by lowercased
  // email. '' means "use the campaign code". A key absent from this map means
  // "not yet touched" → fall back to whatever the paste line parsed (pipe code).
  const [codeOverrides, setCodeOverrides] = useState<Record<string, string>>({});



  // Single morphing send dialog. One dialog steps through three phases:
  //   'confirm'  → ask "send to N recipients?"
  //   'sending'  → spinner, non-dismissable, page locked
  //   'sent'     → green check + summary, OK routes back to the list
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendPhase, setSendPhase] = useState<'confirm' | 'sending' | 'sent'>('confirm');
  const [pendingSendId, setPendingSendId] = useState<string | null>(null);
  const [pendingSendTotal, setPendingSendTotal] = useState(0);
  const [successSummary, setSuccessSummary] = useState('');

  // Live preview modal (server-rendered HTML, shown in a sandboxed iframe).
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');

  // While the send is in flight (or done) the whole page is locked.
  const busy = sendPhase !== 'confirm' && sendDialogOpen;



  const isDraft = isNew || campaign?.status === 'draft';
  const parsedRecipients = useMemo(() => parseEmailList(emailBlock), [emailBlock]);

  // Load existing campaign + recipients.
  useEffect(() => {
    if (isNew || !rawId) return;
    let active = true;
    (async () => {
      try {
        const [c, r] = await Promise.all([getCampaign(rawId), listRecipients(rawId)]);
        if (!active) return;
        if (!c) {
          setError('Campaign not found.');
          return;
        }
        setCampaign(c);
        setRecipientsState(r);
        setName(c.name);
        setSubject(c.subject);
        setDiscountCode(c.discountCode || c.template?.discountCode || '');
        setExpiryDate(c.template?.expiryDate || '');
        if (c.template) {
          setHeadline(c.template.headline);
          setBody(c.template.body);
          setCtaLabel(c.template.ctaLabel);
          setCtaTarget(c.template.ctaTarget);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load campaign');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isNew, rawId]);

  // Fetch active discount codes once for the code dropdowns. Fail-soft: on error
  // the helper returns [] and the dropdowns simply show no preset options (the
  // admin can still type a code in the campaign field).
  useEffect(() => {
    let active = true;
    (async () => {
      const codes = await listActiveDiscountCodes();
      if (active) setActiveCodes(codes);
    })();
    return () => {
      active = false;
    };
  }, []);

  // The effective per-recipient code for a parsed row: an explicit dropdown
  // override wins; otherwise fall back to any pipe-parsed code on the line;
  // otherwise '' (→ use the campaign code at send time).
  function effectiveRecipientCode(r: RecipientInput): string {
    const key = r.email.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(codeOverrides, key)) {
      return codeOverrides[key];
    }
    return r.discountCode || '';
  }

  // Whether the campaign-level code is a real code that isn't in the active list
  // (e.g. an older/typed code on a loaded draft). Drives the "(not in active
  // list)" note so nothing silently changes on old drafts.
  const campaignCodeNotInList =
    !!discountCode && !activeCodes.some((c) => c.code === discountCode);

  function buildDraftInput() {

    const template: CampaignTemplate = {
      headline: headline.trim(),
      body: body.trim(),
      ctaLabel: ctaLabel.trim(),
      ctaTarget,
      discountCode: discountCode.trim() || undefined,
      expiryDate: expiryDate.trim() || undefined,
    };
    return {
      name: name.trim(),
      mode: 'template' as const,
      subject: subject.trim(),
      template,
      discountCode: discountCode.trim() || undefined,
    };
  }

  function validate(): string | null {
    if (!name.trim()) return 'Please give the campaign an internal name.';
    if (!subject.trim()) return 'Please add an email subject line.';
    if (!headline.trim()) return 'Please add a headline.';
    if (!body.trim()) return 'Please add body copy.';
    return null;
  }

  async function handleSave(): Promise<string | null> {
    const v = validate();
    if (v) {
      setError(v);
      return null;
    }
    setError(null);
    setSaving(true);
    try {
      const input = buildDraftInput();
      let id = rawId as string;
      if (isNew) {
        id = await createCampaign(input, userData?.uid);
      } else {
        await updateCampaign(id, input);
      }
      // Persist recipients if the admin pasted a fresh list. Merge each row's
      // effective code (dropdown override → pipe code → none) before saving.
      if (parsedRecipients.length > 0) {
        const withCodes = parsedRecipients.map((r) => ({
          ...r,
          discountCode: effectiveRecipientCode(r) || undefined,
        }));
        const count = await setRecipients(id, withCodes);
        setNotice(`Saved. ${count} unique recipient(s) on the list.`);
        setEmailBlock('');
        setCodeOverrides({});
        const r = await listRecipients(id);
        setRecipientsState(r);
      } else {

        setNotice('Saved.');
      }
      if (isNew) {
        router.replace(`/dashboard/admin/campaigns/${id}`);
      } else {
        const c = await getCampaign(id);
        if (c) setCampaign(c);
      }
      return id;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save campaign');
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest() {
    if (!testEmail.trim()) {
      setError('Enter an email address to receive the test.');
      return;
    }
    setError(null);
    setNotice(null);
    const id = await handleSave();
    if (!id) return;
    setSending(true);
    try {
      await sendCampaignTest(id, testEmail.trim());
      setNotice(`Test email sent to ${testEmail.trim()}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send test email');
    } finally {
      setSending(false);
    }
  }

  async function handleSendAll() {
    setError(null);
    setNotice(null);
    const id = await handleSave();
    if (!id) return;
    const total = parsedRecipients.length || campaign?.recipientCount || recipients.length;
    if (!total) {
      setError('Add at least one recipient before sending.');
      return;
    }
    // Open the styled dialog in its 'confirm' phase.
    setPendingSendId(id);
    setPendingSendTotal(total);
    setSendPhase('confirm');
    setSendDialogOpen(true);
  }

  async function doSend() {
    const id = pendingSendId;
    if (!id) return;
    // Morph the same dialog into its 'sending' phase (spinner, locked).
    setSendPhase('sending');
    setSending(true);
    try {
      const res = await sendCampaign(id);
      const [c, r] = await Promise.all([getCampaign(id), listRecipients(id)]);
      if (c) setCampaign(c);
      setRecipientsState(r);
      setSuccessSummary(
        `Sent to ${res.sentCount} recipient(s). ${res.failedCount} failed, ${res.suppressedCount} suppressed.`,
      );
      // Morph into the final 'sent' phase.
      setSendPhase('sent');
    } catch (e) {
      // On failure, close the dialog and surface an error banner on the page.
      setSendDialogOpen(false);
      setSendPhase('confirm');
      setPendingSendId(null);
      setError(e instanceof Error ? e.message : 'Failed to send campaign');
    } finally {
      setSending(false);
    }
  }

  // Render the current draft into a sandboxed preview (server-side rendering).
  async function handlePreview() {
    setError(null);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewHtml('');
    try {
      const input = buildDraftInput();
      const draft = {
        ...input,
        // The server render path also reads ctaUrl for template mode.
        ctaUrl: ctaTarget === 'services' ? '/services' : '/signup',
      };
      const res = await previewCampaign({
        campaignId: isNew ? undefined : (rawId as string),
        draft,
      });
      setPreviewSubject(res.subject);
      setPreviewHtml(res.html);
    } catch (e) {
      setPreviewOpen(false);
      setError(e instanceof Error ? e.message : 'Failed to render preview');
    } finally {
      setPreviewLoading(false);
    }
  }


  // Load a preset into the Email Content fields. The admin can still edit any
  // field afterwards, or ignore presets entirely and compose from scratch.
  function applyPreset(presetId: string) {
    const preset = getPreset(presetId);
    if (!preset) return;
    setName(preset.name);
    setSubject(preset.subject);
    setHeadline(preset.headline);
    setBody(preset.body);
    setCtaLabel(preset.ctaLabel);
    setCtaTarget(preset.ctaTarget);
    setDiscountCode(preset.discountCode || '');
    setExpiryDate(preset.expiryDate || '');
    setNotice(`Loaded “${preset.label}” template. Edit any field before sending.`);
  }


  if (loading) {

    return (
      <SidebarProvider>
        <AdminSidebar currentPage="campaigns" />
        <SidebarInset>
          <div className="client-surface p-8">
            <div className="flex items-center justify-center py-24 text-muted-foreground">

              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading…
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const listCount = parsedRecipients.length || recipients.length || campaign?.recipientCount || 0;

  return (
    <SidebarProvider>
      <AdminSidebar currentPage="campaigns" />
      <SidebarInset>
        <div className="client-surface p-8">
          <div className="max-w-4xl mx-auto space-y-6">

            <Breadcrumb
              items={[
                { label: 'Admin', href: '/dashboard/admin' },
                { label: 'Campaigns', href: '/dashboard/admin/campaigns' },
                { label: isNew ? 'New Campaign' : campaign?.name || 'Campaign' },
              ]}
            />
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">
            {isNew ? 'New Campaign' : campaign?.name || 'Campaign'}
          </h1>
          {campaign && (
            <Badge
              className={
                campaign.status === 'sent'
                  ? 'bg-green-100 text-green-700'
                  : campaign.status === 'sending'
                  ? 'bg-blue-100 text-blue-700'
                  : campaign.status === 'failed'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700'
              }
            >
              {campaign.status}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Compose a launch invite or seasonal promotion and send it to your list.
        </p>
      </div>


      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Sent results summary */}
      {campaign && campaign.status !== 'draft' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="w-4 h-4" />
                {campaign.recipientCount} recipients
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                {campaign.sentCount} sent
              </span>
              <span className="flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-red-600" />
                {campaign.failedCount} failed
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content editor (draft only) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Email Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDraft && (
            <div className="grid gap-2 rounded-md border border-dashed border-emerald-200 bg-emerald-50/50 p-3">
              <Label htmlFor="preset">Load a template (optional)</Label>
              <select
                id="preset"
                value={selectedPreset}
                onChange={(e) => {
                  setSelectedPreset(e.target.value);
                  if (e.target.value) applyPreset(e.target.value);
                }}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">Choose a starting point…</option>


                {CAMPAIGN_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Prefills the fields below with proven copy. Everything stays editable.
              </p>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="name">Campaign name (internal)</Label>

            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Launch Special — Beta Invites"
              disabled={!isDraft}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="subject">Subject line</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Come explore SHREY.FIT — launch special inside"
              disabled={!isDraft}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              disabled={!isDraft}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              disabled={!isDraft}
              className="bg-transparent"
            />
            <p className="text-xs text-muted-foreground">
              Tip: type <span className="font-mono">{'{{code_terms}}'}</span> where you want an
              auto-written sentence describing each recipient’s discount code (the % or $ off, which
              plans it applies to, and how long). Leave it out to keep your own wording. Wrap text
              in <span className="font-mono">**double asterisks**</span> to make it bold.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="discount">Discount code (optional)</Label>
              <select
                id="discount"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                disabled={!isDraft}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-50"
              >
                <option value="">No code</option>
                {campaignCodeNotInList && (
                  <option value={discountCode}>{discountCode} (not in active list)</option>
                )}
                {activeCodes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Default for everyone. Per-recipient picks below override it.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expiry">Offer expires (optional)</Label>
              <Input
                id="expiry"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                placeholder="Nov 30, 2025"
                disabled={!isDraft}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="ctaLabel">Button label</Label>
              <Input
                id="ctaLabel"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                disabled={!isDraft}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ctaTarget">Button links to</Label>
              <select
                id="ctaTarget"
                value={ctaTarget}
                onChange={(e) => setCtaTarget(e.target.value as CtaTarget)}
                disabled={!isDraft}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-50"
              >
                <option value="signup">Sign up page</option>
                <option value="services">Services page</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recipients */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Recipients ({listCount})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDraft && (
            <div className="grid gap-2">
              <Label htmlFor="emails">Paste emails</Label>
              <Textarea
                id="emails"
                value={emailBlock}
                onChange={(e) => setEmailBlock(e.target.value)}
                rows={4}
                placeholder={
                  'jane@example.com, John Doe <john@example.com>\nsam@example.com | SAM20'
                }
                className="bg-transparent"
              />

              <p className="text-xs text-muted-foreground">
                Separate with commas or new lines. Supports “Name &lt;email&gt;”. Pick a personal
                discount code for anyone below — leave it on “Use campaign code” to fall back to
                the campaign’s code above. Duplicates are removed automatically.{' '}
                {parsedRecipients.length > 0 && (
                  <span className="text-foreground font-medium">
                    {parsedRecipients.length} valid email(s) detected.
                  </span>
                )}
              </p>

              {/* Live parse preview + per-recipient code picker so the admin can
                  assign/verify each email↔code mapping BEFORE saving/sending. */}
              {parsedRecipients.length > 0 && (
                <div className="border rounded-md divide-y max-h-56 overflow-auto mt-1">
                  {parsedRecipients.map((r) => {
                    const eff = effectiveRecipientCode(r);
                    const effNotInList = !!eff && !activeCodes.some((c) => c.code === eff);
                    return (
                      <div
                        key={r.email}
                        className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs"
                      >
                        <span className="truncate min-w-0">
                          {r.name ? `${r.name} · ` : ''}
                          {r.email}
                        </span>
                        <select
                          value={eff}
                          onChange={(e) =>
                            setCodeOverrides((prev) => ({
                              ...prev,
                              [r.email.toLowerCase()]: e.target.value,
                            }))
                          }
                          className="h-7 shrink-0 rounded-md border border-input bg-transparent px-2 text-xs max-w-[45%]"
                        >
                          <option value="">
                            Use campaign code{discountCode ? ` (${discountCode})` : ' (none)'}
                          </option>
                          {/* Preserve a pipe-typed / legacy code not in the active list. */}
                          {effNotInList && (
                            <option value={eff}>{eff} (not in active list)</option>
                          )}
                          {activeCodes.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.code}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          )}

          {recipients.length > 0 && (
            <div className="border rounded-md divide-y max-h-64 overflow-auto">
              {recipients.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <span className="truncate">{r.email}</span>
                    {r.name && <span className="text-muted-foreground ml-2">{r.name}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {r.status === 'suppressed' && <Ban className="w-3.5 h-3.5 text-amber-600" />}
                    <Badge className={RECIPIENT_STATUS_STYLES[r.status]}>{r.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {isDraft && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving || sending || busy}
            variant="outline"
            className="bg-transparent border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Draft
          </Button>

          <Button
            onClick={handlePreview}
            disabled={saving || sending || busy}
            variant="outline"
            className="bg-transparent border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>

          <div className="flex items-center gap-2">
            <Input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-56 bg-transparent"
              disabled={busy}
            />
            <Button
              onClick={handleSendTest}
              disabled={saving || sending || busy}
              variant="outline"
              className="bg-transparent border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            >
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Send Test
            </Button>
          </div>


          <Button onClick={handleSendAll} disabled={saving || sending || busy} className="ml-auto">
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send Campaign
          </Button>
        </div>
      )}

          </div>
        </div>
      </SidebarInset>

      {/*
        Single morphing send dialog — one <AlertDialog> that steps through three
        phases: confirm → sending → sent. While sending or sent, the dialog is
        non-dismissable (onOpenChange is a no-op) so the page stays locked.
      */}
      <AlertDialog
        open={sendDialogOpen}
        onOpenChange={(open) => {
          // Only allow closing (via ESC / outside click) during the confirm phase.
          if (sendPhase === 'confirm') setSendDialogOpen(open);
        }}
      >
        <AlertDialogContent>
          {sendPhase === 'confirm' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Send this campaign?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will email {pendingSendTotal} recipient(s) now. This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    void doSend();
                  }}
                >
                  Send Now
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}

          {sendPhase === 'sending' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
              <AlertDialogTitle className="text-lg">Sending campaign…</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                Emailing {pendingSendTotal} recipient(s). Please keep this window open.
              </AlertDialogDescription>
            </div>
          )}

          {sendPhase === 'sent' && (
            <>
              <div className="flex flex-col items-center justify-center pt-4 pb-2 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-600 mb-3" />
                <AlertDialogTitle className="text-lg">Campaign sent</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  {successSummary}
                </AlertDialogDescription>
              </div>
              <AlertDialogFooter>
                <AlertDialogAction
                  onClick={() => {
                    setSendDialogOpen(false);
                    router.push('/dashboard/admin/campaigns');
                  }}
                >
                  Back to Campaigns
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* Live preview modal — sandboxed iframe of the server-rendered email. */}
      <AlertDialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-600" />
              Email preview
            </AlertDialogTitle>
            <AlertDialogDescription>
              {previewLoading ? 'Rendering…' : previewSubject && `Subject: ${previewSubject}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md border bg-white overflow-hidden">
            {previewLoading ? (
              <div className="flex items-center justify-center py-24 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading preview…
              </div>
            ) : (
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={previewHtml}
                className="w-full h-[60vh] border-0"
              />
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}



