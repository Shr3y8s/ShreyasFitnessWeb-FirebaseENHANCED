'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { signOutUser } from '@/lib/firebase';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  BookOpen,
  PlayCircle,
  Apple,
  HelpCircle,
  Compass,
  Download,
  MessageSquare,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { resourceSections, resourceFaqs, type ResourceSection } from '@/lib/resources';

const ICONS: Record<ResourceSection['icon'], React.ComponentType<{ className?: string }>> = {
  PlayCircle,
  BookOpen,
  Apple,
  HelpCircle,
  Compass,
  Download,
  MessageSquare,
};

export default function ClientResourcesPage() {
  const router = useRouter();
  const { userData } = useAuth();

  const handleLogout = async () => {
    try {
      const result = await signOutUser();
      if (result.success) router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <SidebarProvider>
      <ClientSidebar
        userName={userData?.name}
        userTier={userData?.tier}
        userProfilePhoto={userData?.profilePhotoSmall ?? undefined}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <div className="client-surface p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold mb-2">Resources</h1>
              <p className="text-muted-foreground">
                Your one-stop hub for guides, videos, and help getting the most out of your training.
              </p>
            </div>

            {/* Sections */}
            {resourceSections.map((section) => {
              const Icon = ICONS[section.icon];
              return (
                <Card
                  key={section.id}
                  className="relative transition-all duration-300 hover:shadow-glow bg-primary/5 border border-primary/50"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      {section.title}
                    </CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {section.links.map((link) => {
                        const isExternal = link.external || link.href.startsWith('http');
                        const inner = (
                          <div className="group h-full p-4 rounded-lg border border-primary/20 bg-background/60 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/60 hover:-translate-y-0.5 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm">{link.title}</p>
                                {link.badge && (
                                  <span className="text-[10px] font-semibold uppercase tracking-wide bg-green-100 text-green-800 rounded-full px-2 py-0.5">
                                    {link.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
                              {isExternal && (
                                <p className="text-xs text-primary/70 mt-1 flex items-center gap-1">
                                  <ExternalLink className="h-3 w-3" />
                                  Opens in a new tab
                                </p>
                              )}
                            </div>
                            {isExternal ? (
                              <ExternalLink className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            ) : (
                              <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5" />
                            )}
                          </div>
                        );

                        return isExternal ? (
                          <a
                            key={link.href}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${link.title} (opens in a new tab)`}
                          >
                            {inner}
                          </a>
                        ) : (

                          <Link key={link.href} href={link.href}>
                            {inner}
                          </Link>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* FAQ */}
            <Card className="relative transition-all duration-300 hover:shadow-glow bg-primary/5 border border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  Frequently Asked Questions
                </CardTitle>
                <CardDescription>Quick answers to common questions.</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {resourceFaqs.map((faq, i) => (
                    <AccordionItem key={i} value={`faq-${i}`}>
                      <AccordionTrigger className="text-left text-sm font-medium">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
