'use client';

import React, { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  UserCog, 
  Info as InfoIcon,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { deleteAccount, DeletionMode, DeletionStep, DeleteAccountResponse } from '@/lib/admin-api';

interface Client {
  uid: string;
  name: string;
  email: string;
  createdAt: any;
  subscriptionStatus?: string;
  subscriptionId?: string;
  cancelAtPeriodEnd?: boolean;
  assignedTrainerName?: string;
}

interface ClientManagementPanelProps {
  client: Client;
  onSuccess: () => void;
}

const MODE_DESCRIPTIONS: Record<DeletionMode, { title: string; description: string; warning: string }> = {
  'mock': {
    title: 'Mock (Preview Only)',
    description: 'Preview what would be deleted without making any changes.',
    warning: 'No actual deletion occurs. Safe for testing.'
  },
  'no-traces': {
    title: 'No-Traces (Complete Removal)',
    description: 'Completely remove ALL traces including financial records.',
    warning: '⚠️ DANGEROUS: Use only for test accounts.'
  },
  'gdpr-clean': {
    title: 'GDPR-Clean (Preserve Financials)',
    description: 'Remove personal data but preserve financial records.',
    warning: 'Financial records preserved for legal compliance.'
  }
};

function StepStatusIcon({ status }: { status: DeletionStep['status'] }) {
  switch (status) {
    case 'complete':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'processing':
      return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
    case 'error':
      return <XCircle className="w-4 h-4 text-red-600" />;
    case 'skipped':
      return <InfoIcon className="w-4 h-4 text-gray-400" />;
    default:
      return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
  }
}

function StepDetail({ step }: { step: DeletionStep }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-start gap-3 p-2 rounded hover:bg-gray-50">
        <StepStatusIcon status={step.status} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <h4 className="font-medium text-sm">{step.name}</h4>
              <span className="text-xs text-muted-foreground">
                ({step.itemsFound} found{step.status === 'complete' ? `, ${step.itemsDeleted} deleted` : ''})
              </span>
            </div>
            
            {step.sampleItems && step.sampleItems.length > 0 && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                  <ChevronRight className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground mt-0.5">
            <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{step.collection}</code>
          </div>
          
          {step.error && (
            <Alert variant="destructive" className="mt-1">
              <AlertDescription className="text-xs">{step.error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
      
      {step.sampleItems && step.sampleItems.length > 0 && (
        <CollapsibleContent>
          <div className="ml-9 mt-1 p-2 bg-gray-50 rounded text-xs">
            <p className="font-medium text-gray-700 mb-1">Sample items:</p>
            <ul className="space-y-0.5">
              {step.sampleItems.slice(0, 5).map((item, idx) => (
                <li key={idx} className="text-gray-600 font-mono text-xs truncate">
                  • {item}
                </li>
              ))}
              {step.sampleItems.length > 5 && (
                <li className="text-gray-500">... and {step.sampleItems.length - 5} more</li>
              )}
            </ul>
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export default function ClientManagementPanel({ client, onSuccess }: ClientManagementPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('delete');
  
  // Delete tab state
  const [deletionMode, setDeletionMode] = useState<DeletionMode>('gdpr-clean');
  const [emailConfirmation, setEmailConfirmation] = useState('');
  const [reason, setReason] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DeleteAccountResponse | null>(null);

  const handleDelete = async () => {
    // Validate
    if (deletionMode !== 'mock' && emailConfirmation !== client.email) {
      setError('Email does not match. Please type the exact email address.');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for deletion.');
      return;
    }

    if (deletionMode !== 'mock' && !understood) {
      setError('You must confirm that you understand this action is permanent.');
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      const response = await deleteAccount({
        targetUserId: client.uid,
        mode: deletionMode,
        adminOverride: false,
        reason: reason.trim(),
      });

      setResult(response);
      setIsProcessing(false);
      
      // Only trigger success callback for real deletions
      if (deletionMode !== 'mock') {
        setTimeout(() => onSuccess(), 2000);
      }
    } catch (err: any) {
      console.error('Delete account error:', err);
      setError(err.message || 'Failed to delete account');
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setDeletionMode('gdpr-clean');
    setEmailConfirmation('');
    setReason('');
    setUnderstood(false);
    setError(null);
    setResult(null);
    setIsProcessing(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset after collapse animation
      setTimeout(resetState, 200);
    }
  };

  const modeInfo = MODE_DESCRIPTIONS[deletionMode];

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <UserCog className="w-4 h-4" />
        Manage
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </Button>
      
      {isOpen && (
        <Card className="mt-3 border-l-4 border-l-primary w-full">
          <CardContent className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="delete">Delete Account</TabsTrigger>
                <TabsTrigger value="reassign" disabled>Reassign Trainer</TabsTrigger>
                <TabsTrigger value="details" disabled>View Details</TabsTrigger>
              </TabsList>
              
              {/* DELETE TAB */}
              <TabsContent value="delete" className="space-y-4 mt-4">
                {/* Show results if available */}
                {result ? (
                  <div className="space-y-3">
                    <Alert className={deletionMode === 'mock' ? 'border-blue-500 bg-blue-50' : 'border-green-500 bg-green-50'}>
                      <InfoIcon className={`h-4 w-4 ${deletionMode === 'mock' ? 'text-blue-600' : 'text-green-600'}`} />
                      <AlertDescription className={deletionMode === 'mock' ? 'text-blue-900' : 'text-green-900'}>
                        <p className="font-semibold mb-1">
                          {deletionMode === 'mock' ? 'Preview Complete' : 'Account Deleted Successfully'}
                        </p>
                        <ul className="list-disc list-inside space-y-0.5 text-sm">
                          <li>Collections: {result.summary.totalCollectionsProcessed}</li>
                          <li>Items found: {result.summary.totalItemsFound}</li>
                          <li>Items {deletionMode === 'mock' ? 'would be' : ''} deleted: {result.summary.totalItemsDeleted}</li>
                        </ul>
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {result.steps.map((step, idx) => (
                        <StepDetail key={idx} step={step} />
                      ))}
                    </div>

                    <Button onClick={resetState} className="w-full">
                      {deletionMode === 'mock' ? 'Run Another Preview' : 'Close'}
                    </Button>
                  </div>
                ) : isProcessing ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 py-4">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm font-medium">
                        {deletionMode === 'mock' ? 'Analyzing account...' : 'Deleting account...'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Mode Selection */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Deletion Mode:</Label>
                      <RadioGroup value={deletionMode} onValueChange={(v) => setDeletionMode(v as DeletionMode)}>
                        {(Object.keys(MODE_DESCRIPTIONS) as DeletionMode[]).map((mode) => {
                          const info = MODE_DESCRIPTIONS[mode];
                          return (
                            <div key={mode} className="flex items-start space-x-2 p-2 rounded border hover:bg-accent">
                              <RadioGroupItem value={mode} id={`${client.uid}-${mode}`} className="mt-0.5" />
                              <div className="flex-1">
                                <Label htmlFor={`${client.uid}-${mode}`} className="font-medium text-sm cursor-pointer">
                                  {info.title}
                                </Label>
                                <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>
                                <p className="text-xs text-amber-700 mt-1">{info.warning}</p>
                              </div>
                            </div>
                          );
                        })}
                      </RadioGroup>
                    </div>

                    {/* Email Confirmation */}
                    {deletionMode !== 'mock' && (
                      <div className="space-y-2">
                        <Label htmlFor={`email-${client.uid}`} className="text-sm">
                          Type client's email to confirm:
                        </Label>
                        <Input
                          id={`email-${client.uid}`}
                          type="email"
                          placeholder={client.email}
                          value={emailConfirmation}
                          onChange={(e) => setEmailConfirmation(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    )}

                    {/* Reason */}
                    <div className="space-y-2">
                      <Label htmlFor={`reason-${client.uid}`} className="text-sm">Reason (required):</Label>
                      <Textarea
                        id={`reason-${client.uid}`}
                        placeholder={deletionMode === 'mock' ? 'e.g., Testing deletion flow' : 'e.g., User requested'}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                    </div>

                    {/* Confirmation Checkbox */}
                    {deletionMode !== 'mock' && (
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id={`understood-${client.uid}`}
                          checked={understood}
                          onCheckedChange={(checked) => setUnderstood(checked as boolean)}
                        />
                        <Label
                          htmlFor={`understood-${client.uid}`}
                          className="text-sm font-normal leading-tight"
                        >
                          I understand this is permanent and cannot be undone
                        </Label>
                      </div>
                    )}

                    {/* Error Display */}
                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">{error}</AlertDescription>
                      </Alert>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant={deletionMode === 'mock' ? 'default' : 'destructive'}
                        onClick={handleDelete}
                        disabled={
                          !reason || 
                          (deletionMode !== 'mock' && (!emailConfirmation || !understood))
                        }
                        className="flex-1"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {deletionMode === 'mock' ? 'Run Preview' : 'Delete Account'}
                      </Button>
                      <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>
              
              {/* REASSIGN TAB (Placeholder) */}
              <TabsContent value="reassign" className="space-y-4 mt-4">
                <Alert>
                  <InfoIcon className="h-4 w-4" />
                  <AlertDescription>
                    Trainer reassignment feature coming soon.
                  </AlertDescription>
                </Alert>
              </TabsContent>
              
              {/* DETAILS TAB (Placeholder) */}
              <TabsContent value="details" className="space-y-4 mt-4">
                <Alert>
                  <InfoIcon className="h-4 w-4" />
                  <AlertDescription>
                    Client details view coming soon.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </>
  );
}
