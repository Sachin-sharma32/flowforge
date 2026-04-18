'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TypographyMuted, TypographySmall } from '@/components/ui/typography';
import { api } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAppDispatch } from '@/stores/hooks';
import { fetchWorkspaces } from '@/stores/workspace-slice';
import { toast } from 'sonner';

interface Invitation {
  _id: string;
  token: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  workspaceId: { _id: string; name: string } | null;
  invitedBy: { _id: string; name: string; email: string } | null;
}

export function InvitationBell() {
  const dispatch = useAppDispatch();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInvitations = useCallback(async () => {
    try {
      const { data } = await api.get('/workspaces/invitations/mine');
      setInvitations(data.data || []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
    const interval = setInterval(fetchInvitations, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [fetchInvitations]);

  const handleAccept = async (token: string) => {
    setLoading(true);
    try {
      await api.post(`/workspaces/invitations/${token}/accept`);
      toast.success('Invitation accepted! You are now a member of the workspace.');
      await dispatch(fetchWorkspaces()).unwrap();
      await fetchInvitations();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to accept invitation'));
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async (token: string) => {
    setLoading(true);
    try {
      await api.post(`/workspaces/invitations/${token}/decline`);
      toast.success('Invitation declined.');
      await fetchInvitations();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to decline invitation'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {invitations.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]"
            >
              {invitations.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b px-4 py-3">
          <TypographySmall className="font-semibold">Notifications</TypographySmall>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {invitations.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <TypographyMuted>No pending invitations</TypographyMuted>
            </div>
          ) : (
            invitations.map((inv) => (
              <div key={inv._id} className="border-b px-4 py-3 last:border-0">
                <TypographySmall className="font-medium">Workspace Invitation</TypographySmall>
                <TypographyMuted className="mt-1 text-xs">
                  {inv.invitedBy?.name || 'Someone'} invited you to join{' '}
                  <strong>{inv.workspaceId?.name || 'a workspace'}</strong> as{' '}
                  <strong>{inv.role}</strong>
                </TypographyMuted>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleAccept(inv.token)}
                    disabled={loading}
                  >
                    <Check className="mr-1 h-3 w-3" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => handleDecline(inv.token)}
                    disabled={loading}
                  >
                    <X className="mr-1 h-3 w-3" /> Decline
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
