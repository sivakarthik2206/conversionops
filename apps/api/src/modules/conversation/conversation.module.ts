import { Module } from '@nestjs/common';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { HumanOverrideService } from './human-override.service';
import { SendMessageHandler } from './commands/send-message.handler';
import { TakeoverConversationHandler } from './commands/takeover-conversation.handler';
import { ReleaseToAIHandler } from './commands/release-to-ai.handler';
import { EscalateConversationHandler } from './commands/escalate-conversation.handler';
import { ListConversationsHandler } from './queries/list-conversations.handler';
import { GetConversationHandler } from './queries/get-conversation.handler';

@Module({
  controllers: [ConversationController],
  providers: [
    ConversationService,
    HumanOverrideService,
    SendMessageHandler,
    TakeoverConversationHandler,
    ReleaseToAIHandler,
    EscalateConversationHandler,
    ListConversationsHandler,
    GetConversationHandler,
  ],
  exports: [ConversationService, HumanOverrideService],
})
export class ConversationModule {}
