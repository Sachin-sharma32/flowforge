import { StepFactory } from './step-factory';
import { HttpRequestHandler } from './handlers/http-request.handler';
import { ConditionHandler } from './handlers/condition.handler';
import { TransformHandler } from './handlers/transform.handler';
import { DelayHandler } from './handlers/delay.handler';
import { SendEmailHandler } from './handlers/send-email.handler';
import { SlackMessageHandler } from './handlers/slack-message.handler';
import { GoogleDriveHandler } from './handlers/google-drive.handler';
import { GoogleCalendarHandler } from './handlers/google-calendar.handler';
import { GmailHandler } from './handlers/gmail.handler';
import { NotionHandler } from './handlers/notion.handler';
import { IStepHandler } from '../domain/interfaces/step-handler.interface';

const handlerRegistry: Array<[string, new () => IStepHandler]> = [
  ['http_request', HttpRequestHandler],
  ['condition', ConditionHandler],
  ['transform', TransformHandler],
  ['delay', DelayHandler],
  ['send_email', SendEmailHandler],
  ['slack_message', SlackMessageHandler],
  ['google_drive', GoogleDriveHandler],
  ['google_calendar', GoogleCalendarHandler],
  ['gmail', GmailHandler],
  ['notion', NotionHandler],
];

export function registerStepHandlers(): void {
  for (const [type, handler] of handlerRegistry) {
    if (!StepFactory.has(type)) {
      StepFactory.register(type, handler);
    }
  }
}
