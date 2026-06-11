# ConversionOps — Product Domain
# docs/claude/DOMAIN.md

## PRODUCT
AI lead conversion infrastructure for US real estate agents and brokerages.
Not a chatbot. Not a CRM. Operational infrastructure.
Every inbound lead gets an AI response in 60 seconds, 24/7.

## CUSTOMERS
- Solo agents:       $500 setup + $750/month
- Small brokerage:   $2,500 setup + $2,500/month (up to 15 agents)
- Enterprise:        $25,000 setup + $5,000/month (unlimited)

## TARGET MARKETS (priority)
1. Miami / Fort Lauderdale, FL
2. Orlando, FL
3. Tampa / St. Pete, FL
4. San Diego, CA
5. Sacramento / Riverside, CA

## THE 9 PROBLEMS WE SOLVE
1. Slow response (agents: 15+ hours average — we: 60 seconds)
2. Missed calls (35-40% missed — text-back in 8 seconds)
3. Dead CRM leads (70% never followed up — we reactivate)
4. Inconsistent follow-up (agents: 1-2 attempts — buyers need 8-12)
5. Wasted Zillow spend ($1,200/month, 60% leads uncontacted)
6. ISA cost ($45-65K/year — we replace for $750/month)
7. No accountability (brokers blind to ignored leads)
8. Poor routing (wrong leads to wrong agents)
9. Zero visibility (no analytics — we provide brokerage-wide funnels)

## MISSED CALL FLOW (8-second SLA)
```
Call arrives → Twilio webhook → validate → idempotency → consent check
→ enqueue missed-call (HIGHEST priority)
Processor fires within 8 seconds:
→ SMS: "Hi! You just called [AgentName]'s office. This is their AI assistant —
        are you looking to buy or sell in [area]? I can help right now."
→ create Lead (source: MISSED_CALL)
→ create Conversation
→ enqueue lead-intake for normal AI flow
```

## DEAD LEAD REACTIVATION
```
Conditions: status=DORMANT, reactivationCount<3, lastActivity>30 days, ConsentRecord=OPTED_IN
Message: "Hi [name], we spoke [X] weeks ago about [area].
          The market has shifted — [X] new listings match what you described.
          Still looking?"
On send: increment reactivationCount, transition DORMANT → REACTIVATED via XState
```
