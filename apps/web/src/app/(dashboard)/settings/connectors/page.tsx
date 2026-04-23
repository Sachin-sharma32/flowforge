'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TypographyH1, TypographyMuted, TypographySmall } from '@/components/ui/typography';
import {
  ConnectorConfigDialog,
  CONNECTOR_DEFINITIONS,
  getConnectorStatus,
  type ConnectorDefinition,
} from '@/components/connectors/connector-config-dialog';

export default function ConnectorsPage() {
  const [selectedConnector, setSelectedConnector] = useState<ConnectorDefinition | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [, forceUpdate] = useState(0);

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) forceUpdate((n) => n + 1); // refresh statuses
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <TypographyH1>Connectors</TypographyH1>
          <TypographyMuted className="mt-1.5">
            Configure integrations and external service credentials
          </TypographyMuted>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CONNECTOR_DEFINITIONS.map((connector) => {
          const status = getConnectorStatus(connector.type);
          return (
            <Card
              key={connector.type}
              className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
              onClick={() => {
                setSelectedConnector(connector);
                setIsDialogOpen(true);
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-3 w-3 rounded-full ${status === 'connected' ? 'bg-green-500' : connector.color}`}
                    />
                    {connector.name}
                  </div>
                  <Badge variant={status === 'connected' ? 'success' : 'secondary'}>
                    {status === 'connected' ? 'Connected' : 'Not configured'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TypographySmall className="text-muted-foreground">
                  {connector.description}
                </TypographySmall>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ConnectorConfigDialog
        connector={selectedConnector}
        open={isDialogOpen}
        onOpenChange={handleOpenChange}
      />
    </div>
  );
}
