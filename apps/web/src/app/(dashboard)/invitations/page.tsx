'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TypographyMuted } from '@/components/ui/typography';
import { api } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAppDispatch } from '@/stores/hooks';
import { fetchWorkspaces } from '@/stores/workspace-slice';
import { toast } from 'sonner';
import { Check, X, Loader2 } from 'lucide-react';

function InvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'idle' | 'accepted' | 'declined' | 'error'>(
    'idle',
  );
  const [error, setError] = useState('');

  const handleAccept = async () => {
    if (!token) return;
    setStatus('loading');
    try {
      await api.post(`/workspaces/invitations/${token}/accept`);
      setStatus('accepted');
      await dispatch(fetchWorkspaces()).unwrap();
      toast.success('Invitation accepted!');
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to accept invitation'));
      setStatus('error');
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    setStatus('loading');
    try {
      await api.post(`/workspaces/invitations/${token}/decline`);
      setStatus('declined');
      toast.success('Invitation declined.');
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to decline invitation'));
      setStatus('error');
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <TypographyMuted>Invalid invitation link.</TypographyMuted>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Workspace Invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'accepted' && (
            <div className="text-center text-green-600">
              <Check className="mx-auto h-8 w-8 mb-2" />
              <p>Invitation accepted! Redirecting...</p>
            </div>
          )}
          {status === 'declined' && (
            <div className="text-center text-muted-foreground">
              <X className="mx-auto h-8 w-8 mb-2" />
              <p>Invitation declined. Redirecting...</p>
            </div>
          )}
          {status === 'error' && (
            <div className="text-center text-destructive">
              <p>{error}</p>
              <Button className="mt-4" onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </Button>
            </div>
          )}
          {(status === 'idle' || status === 'loading') && (
            <>
              <TypographyMuted>
                You have been invited to join a workspace. Would you like to accept?
              </TypographyMuted>
              <div className="flex gap-3">
                <Button onClick={handleAccept} disabled={status === 'loading'} className="flex-1">
                  {status === 'loading' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Accept
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDecline}
                  disabled={status === 'loading'}
                  className="flex-1"
                >
                  <X className="mr-2 h-4 w-4" /> Decline
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function InvitationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <InvitationContent />
    </Suspense>
  );
}
