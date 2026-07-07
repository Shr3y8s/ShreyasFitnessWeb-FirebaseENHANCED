'use client';

// Marketing Campaigns — admin list page (Phase 1).
//
// Lists all campaigns with search, status filtering, status-grouped sections,
// and incremental "Load more" pagination so the page stays responsive as the
// list grows. See docs/02-implementation/marketing-campaigns/design.md.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Megaphone,
  Plus,
  Loader2,
  Mail,
  Users,
  CheckCircle2,
  XCircle,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/AdminSidebar';
import { Breadcrumb } from '@/components/Breadcrumb';
import { listCampaigns, tsToMillis } from '@/lib/campaigns-api';
import type { Campaign, CampaignStatus } from '@/types/campaigns';


const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sending: 'bg-blue-100 text-blue-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

// Ordered status groups. Drafts/in-progress ("pending") float to the top so
// the admin sees actionable items first; completed campaigns follow.
const GROUPS: { key: CampaignStatus; label: string }[] = [
  { key: 'draft', label: 'Drafts' },
  { key: 'sending', label: 'Sending' },
  { key: 'sent', label: 'Sent' },
  { key: 'failed', label: 'Failed' },
];

type StatusFilter = 'all' | CampaignStatus;

const PAGE_SIZE = 10;

function fmtDate(v: unknown): string {
  const ms = tsToMillis(v);
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await listCampaigns();
        if (active) setCampaigns(rows);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load campaigns');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Reset pagination whenever the query narrows/widens.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, statusFilter]);

  // Filter (search + status) then sort newest-first.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return campaigns
      .filter((c) => (statusFilter === 'all' ? true : c.status === statusFilter))
      .filter((c) => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.subject.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (tsToMillis(b.createdAt) ?? 0) - (tsToMillis(a.createdAt) ?? 0));

  }, [campaigns, search, statusFilter]);

  // Apply pagination first, then bucket into status groups so "Load more"
  // works predictably across the whole result set.
  const visible = filtered.slice(0, visibleCount);
  const grouped = useMemo(() => {
    return GROUPS.map((g) => ({
      ...g,
      items: visible.filter((c) => c.status === g.key),
    })).filter((g) => g.items.length > 0);
  }, [visible]);

  const hasMore = filtered.length > visibleCount;

  function renderCard(c: Campaign) {
    return (
      <Link key={c.id} href={`/dashboard/admin/campaigns/${c.id}`} className="block">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-base truncate">{c.name}</CardTitle>
                <p className="text-sm text-muted-foreground truncate">{c.subject}</p>
              </div>
              <Badge className={STATUS_STYLES[c.status]}>{c.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {c.recipientCount} recipients
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                {c.sentCount} sent
              </span>
              {c.failedCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-red-600" />
                  {c.failedCount} failed
                </span>
              )}
              <span className="ml-auto">{fmtDate(c.createdAt)}</span>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <SidebarProvider>
      <AdminSidebar currentPage="campaigns" />
      <SidebarInset>
        <div className="client-surface p-8">
          <div className="max-w-5xl mx-auto space-y-6">

            <Breadcrumb
              items={[
                { label: 'Admin', href: '/dashboard/admin' },
                { label: 'Campaigns' },
              ]}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Email Campaigns</h1>
                  <p className="text-sm text-muted-foreground">
                    Send launch invites and seasonal promotions to a list of emails.
                  </p>
                </div>
              </div>
              <Button onClick={() => router.push('/dashboard/admin/campaigns/new')}>
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </div>

            {/* Search + status filter toolbar */}
            {!loading && !error && campaigns.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or subject…"
                    className="pl-9 bg-transparent"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm sm:w-48"
                >
                  <option value="all">All statuses</option>
                  <option value="draft">Drafts</option>
                  <option value="sending">Sending</option>
                  <option value="sent">Sent</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading campaigns…
              </div>
            ) : error ? (
              <Card>
                <CardContent className="py-10 text-center text-red-600">{error}</CardContent>
              </Card>
            ) : campaigns.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto">
                    <Mail className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">No campaigns yet</p>
                    <p className="text-sm text-muted-foreground">
                      Create your first campaign to invite people to explore your services.
                    </p>
                  </div>
                  <Button onClick={() => router.push('/dashboard/admin/campaigns/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Campaign
                  </Button>
                </CardContent>
              </Card>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No campaigns match your search.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {grouped.map((group) => (
                  <section key={group.key} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {group.label}
                      </h2>
                      <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {group.items.length}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {group.items.map(renderCard)}
                    </div>
                  </section>
                ))}

                {hasMore && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                      className="bg-transparent border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                    >
                      Load more ({filtered.length - visibleCount} remaining)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
