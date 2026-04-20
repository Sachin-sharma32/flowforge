import { Connector, IConnectorDocument } from '../models/connector.model';
import { Workflow } from '../models/workflow.model';
import { NotFoundError } from '../domain/errors';
import type { CreateConnectorInput, UpdateConnectorInput, IConnector } from '@flowforge/shared';

export class ConnectorService {
  /** Serialize a Connector doc + usedByWorkflows count into the API shape. */
  private async toApiShape(doc: IConnectorDocument, workspaceId: string): Promise<IConnector> {
    const usedByWorkflows = await Workflow.countDocuments({
      workspaceId,
      isTemplate: false,
      'steps.type': doc.type,
    });

    return {
      id: doc._id.toString(),
      workspaceId,
      type: doc.type,
      name: doc.name,
      accountLabel: doc.accountLabel,
      status: doc.status,
      usedByWorkflows,
      createdBy: doc.createdBy?.toString() ?? undefined,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  async list(workspaceId: string): Promise<IConnector[]> {
    const docs = await Connector.find({ workspaceId }).lean<IConnectorDocument[]>();
    return Promise.all(docs.map((d) => this.toApiShape(d as IConnectorDocument, workspaceId)));
  }

  async getById(connectorId: string, workspaceId: string): Promise<IConnector> {
    const doc = await Connector.findOne({ _id: connectorId, workspaceId });
    if (!doc) throw new NotFoundError('Connector not found');
    return this.toApiShape(doc, workspaceId);
  }

  async create(
    input: CreateConnectorInput,
    workspaceId: string,
    userId: string,
  ): Promise<IConnector> {
    const doc = await Connector.create({
      workspaceId,
      type: input.type,
      name: input.name,
      accountLabel: input.accountLabel,
      credentials: input.credentials ?? {},
      status: 'connected',
      createdBy: userId,
    });
    return this.toApiShape(doc, workspaceId);
  }

  async update(
    connectorId: string,
    workspaceId: string,
    input: UpdateConnectorInput,
  ): Promise<IConnector> {
    const doc = await Connector.findOne({ _id: connectorId, workspaceId });
    if (!doc) throw new NotFoundError('Connector not found');

    if (input.name !== undefined) doc.name = input.name;
    if (input.accountLabel !== undefined) doc.accountLabel = input.accountLabel;
    if (input.status !== undefined) doc.status = input.status;
    if (input.credentials !== undefined) {
      // Merge new credentials on top of existing ones
      for (const [k, v] of Object.entries(input.credentials)) {
        doc.credentials[k] = v;
      }
    }

    await doc.save();
    return this.toApiShape(doc, workspaceId);
  }

  async remove(connectorId: string, workspaceId: string): Promise<void> {
    const result = await Connector.deleteOne({ _id: connectorId, workspaceId });
    if (result.deletedCount === 0) throw new NotFoundError('Connector not found');
  }
}
