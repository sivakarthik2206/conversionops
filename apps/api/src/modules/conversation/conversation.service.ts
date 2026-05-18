import { Injectable } from '@nestjs/common';
import { Result } from '@conversionops/types';
import type { Conversation, Message } from '@conversionops/db';
import { SendMessageHandler } from './commands/send-message.handler';
import { SendMessageCommand } from './commands/send-message.command';
import { TakeoverConversationHandler } from './commands/takeover-conversation.handler';
import { TakeoverConversationCommand } from './commands/takeover-conversation.command';
import { ReleaseToAIHandler } from './commands/release-to-ai.handler';
import { ReleaseToAICommand } from './commands/release-to-ai.command';
import { EscalateConversationHandler } from './commands/escalate-conversation.handler';
import { EscalateConversationCommand, EscalationLevelInput } from './commands/escalate-conversation.command';
import { ListConversationsHandler } from './queries/list-conversations.handler';
import { ListConversationsQuery, ConversationListDto } from './queries/list-conversations.query';
import { GetConversationHandler } from './queries/get-conversation.handler';
import { GetConversationQuery, ConversationDetailDto } from './queries/get-conversation.query';

@Injectable()
export class ConversationService {
  constructor(
    private readonly sendMessageHandler: SendMessageHandler,
    private readonly takeoverHandler: TakeoverConversationHandler,
    private readonly releaseHandler: ReleaseToAIHandler,
    private readonly escalateHandler: EscalateConversationHandler,
    private readonly listHandler: ListConversationsHandler,
    private readonly getHandler: GetConversationHandler,
  ) {}

  sendMessage(cmd: SendMessageCommand): Promise<Result<Message>> {
    return this.sendMessageHandler.execute(cmd);
  }

  takeoverConversation(cmd: TakeoverConversationCommand): Promise<Result<Conversation>> {
    return this.takeoverHandler.execute(cmd);
  }

  releaseToAI(cmd: ReleaseToAICommand): Promise<Result<Conversation>> {
    return this.releaseHandler.execute(cmd);
  }

  escalate(cmd: EscalateConversationCommand): Promise<Result<Conversation>> {
    return this.escalateHandler.execute(cmd);
  }

  listConversations(query: ListConversationsQuery): Promise<Result<ConversationListDto>> {
    return this.listHandler.execute(query);
  }

  getConversation(id: string, workspaceId: string): Promise<Result<ConversationDetailDto>> {
    return this.getHandler.execute(new GetConversationQuery(id, workspaceId));
  }
}
