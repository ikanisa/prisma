# easyMO System Architecture Documentation

## 🏗️ High-Level Architecture

```mermaid
graph TB
    subgraph "User Interface"
        WA[WhatsApp Users]
        AP[Admin Panel]
    end
    
    subgraph "API Layer"
        WH[WhatsApp Webhook]
        EF[Edge Functions]
        AI[AI Orchestrator]
    end
    
    subgraph "Business Logic"
        AG[AI Agents]
        WF[Workflow Engine]
        QA[QA Framework]
    end
    
    subgraph "Data Layer"
        DB[(Supabase DB)]
        ST[Storage]
        RT[Realtime]
    end
    
    subgraph "External Services"
        MM[Mobile Money]
        WB[WhatsApp Business API]
        OAI[OpenAI API]
    end
    
    WA --> WH
    AP --> EF
    WH --> AI
    AI --> AG
    AG --> WF
    WF --> DB
    EF --> DB
    AG --> OAI
    WF --> MM
    AI --> WB
    QA --> EF
    DB --> RT
    DB --> ST
```

## 🧠 AI Agent Architecture

### Agent Hierarchy
```
MCP Orchestrator
├── OnboardingAgent (User registration)
├── PaymentAgent (Mobile money)
├── MarketplaceAgent (Product discovery)
├── LogisticsAgent (Driver matching)
├── BusinessAgent (Bar/Pharmacy/Hardware)
├── EventsAgent (Event booking)
├── MarketingAgent (Campaigns)
└── SupportAgent (Customer service)
```

### Agent Communication Flow
```mermaid
sequenceDiagram
    participant U as User
    participant W as WhatsApp
    participant O as MCP Orchestrator
    participant A as AI Agent
    participant D as Database
    participant E as External API

    U->>W: Send message
    W->>O: Webhook delivery
    O->>A: Route to appropriate agent
    A->>D: Fetch context/data
    A->>E: External API calls (if needed)
    A->>O: Return response
    O->>W: Send reply
    W->>U: Deliver message
```

## 🗄️ Database Schema Overview

### Core Tables
- **users**: User profiles and authentication
- **conversations**: Message history and context
- **agents**: AI agent configurations
- **businesses**: Business registrations
- **products**: Inventory across verticals
- **orders**: Purchase transactions
- **deliveries**: Logistics tracking

### Security Tables
- **user_roles**: Role-based access control
- **security_audit_log**: Security event tracking
- **performance_metrics**: System monitoring

### QA Tables
- **qa_test_suites**: Test suite definitions
- **qa_test_cases**: Individual test cases
- **qa_test_runs**: Test execution results

## 🚀 Edge Functions Architecture

### Function Categories

#### 1. Core System Functions
- `whatsapp-webhook`: Main WhatsApp message processor
- `whatsapp-unified-handler`: Unified message routing
- `mcp-orchestrator`: AI agent coordination
- `response-sender`: Message delivery

#### 2. AI & Processing Functions
- `ai-processor`: Core AI message processing
- `yaml-agent-processor`: YAML-based agent execution
- `unified-message-handler`: Message preprocessing
- `quality-evaluator`: Response quality assessment

#### 3. Business Logic Functions
- `assign-driver`: Driver-passenger matching
- `generate-payment`: Payment processing
- `create-pharmacy-order`: Medicine ordering
- `fare-estimator`: Price calculations

#### 4. Administration Functions
- `security-audit-engine`: Security monitoring
- `qa-execution-engine`: Test automation
- `production-optimizer`: Performance tuning
- `system-health-monitor`: Health checks

#### 5. Marketing & Automation
- `marketing-automation`: Campaign management
- `cron-scheduler`: Background job execution
- `drip-scheduler`: Automated messaging
- `push-marketing`: Targeted campaigns

## 🔐 Security Architecture

### Multi-Layer Security
```mermaid
graph TB
    subgraph "Application Layer"
        A1[Input Validation]
        A2[JWT Verification]
        A3[Rate Limiting]
    end
    
    subgraph "Database Layer"
        B1[Row Level Security]
        B2[Role-Based Access]
        B3[Audit Logging]
    end
    
    subgraph "Infrastructure Layer"
        C1[HTTPS/TLS]
        C2[CORS Policies]
        C3[Secret Management]
    end
    
    A1 --> B1
    A2 --> B2
    A3 --> B3
    B1 --> C1
    B2 --> C2
    B3 --> C3
```

### RLS Policy Examples
```sql
-- Users can only access their own data
CREATE POLICY "Users own data" ON conversations
  FOR ALL USING (user_id = auth.uid());

-- Admins can access everything
CREATE POLICY "Admin access" ON conversations
  FOR ALL USING (is_admin());

-- Business owners can access their business data
CREATE POLICY "Business owner access" ON products
  FOR ALL USING (business_id IN (
    SELECT id FROM businesses WHERE owner_user_id = auth.uid()
  ));
```

## 📊 Monitoring & Observability

### Metrics Collection
```mermaid
graph LR
    subgraph "Sources"
        EF[Edge Functions]
        DB[Database]
        WA[WhatsApp API]
    end
    
    subgraph "Collectors"
        SM[System Metrics]
        PM[Performance Monitor]
        QM[QA Monitor]
    end
    
    subgraph "Storage"
        MT[Metrics Tables]
        AL[Audit Logs]
    end
    
    subgraph "Dashboards"
        AD[Admin Dashboard]
        QD[QA Dashboard]
        PR[Production Readiness]
    end
    
    EF --> SM
    DB --> PM
    WA --> QM
    SM --> MT
    PM --> MT
    QM --> AL
    MT --> AD
    MT --> QD
    AL --> PR
```

### Key Performance Indicators
- **Response Time**: AI agent response latency
- **Success Rate**: Message processing success rate
- **Error Rate**: System error frequency
- **Uptime**: System availability percentage

## 🔄 Data Flow Patterns

### User Message Processing
```mermaid
flowchart TD
    A[WhatsApp Message] --> B{Webhook Validation}
    B -->|Valid| C[Message Preprocessing]
    B -->|Invalid| D[Reject & Log]
    C --> E[Intent Analysis]
    E --> F{Agent Routing}
    F --> G[Execute Agent Logic]
    G --> H[Generate Response]
    H --> I[Quality Check]
    I -->|Pass| J[Send Response]
    I -->|Fail| K[Escalate to Human]
    J --> L[Log Conversation]
    K --> L
```

### Order Processing Flow
```mermaid
stateDiagram-v2
    [*] --> OrderCreated
    OrderCreated --> PaymentPending
    PaymentPending --> PaymentConfirmed
    PaymentPending --> PaymentFailed
    PaymentConfirmed --> DriverAssigned
    DriverAssigned --> InTransit
    InTransit --> Delivered
    PaymentFailed --> OrderCancelled
    Delivered --> [*]
    OrderCancelled --> [*]
```

## 🧪 Testing Architecture

### Test Pyramid
```mermaid
graph TB
    subgraph "E2E Tests"
        E1[Complete User Journeys]
        E2[WhatsApp Integration]
    end
    
    subgraph "Integration Tests"
        I1[API Integration]
        I2[Database Operations]
        I3[AI Agent Responses]
    end
    
    subgraph "Unit Tests"
        U1[Function Logic]
        U2[Data Validation]
        U3[Business Rules]
    end
    
    E1 --> I1
    E2 --> I2
    I3 --> U1
    I2 --> U2
    I1 --> U3
```

### QA Automation
- **Continuous Testing**: Automated test execution on deployment
- **Performance Benchmarking**: Response time monitoring
- **Load Testing**: Concurrent user simulation
- **Security Scanning**: Automated vulnerability assessment

## 🚀 Deployment Architecture

### Environment Stages
```mermaid
graph LR
    DEV[Development] --> STAGING[Staging]
    STAGING --> PROD[Production]
    
    subgraph "Development"
        D1[Local Testing]
        D2[Feature Development]
    end
    
    subgraph "Staging"
        S1[Integration Testing]
        S2[QA Validation]
    end
    
    subgraph "Production"
        P1[Live System]
        P2[Monitoring]
    end
```

### CI/CD Pipeline
1. **Code Push**: Git repository update
2. **Build**: TypeScript compilation and optimization
3. **Test**: Automated test suite execution
4. **Deploy**: Edge function deployment
5. **Monitor**: Health check verification

## 📈 Scaling Considerations

### Horizontal Scaling
- **Edge Functions**: Auto-scaling based on demand
- **Database**: Connection pooling and read replicas
- **Storage**: CDN integration for static assets

### Performance Optimization
- **Caching**: Response caching for frequent queries
- **Indexing**: Optimized database indexes
- **Compression**: Message and asset compression

---

This architecture supports the easyMO WhatsApp super-app's requirements for scalability, reliability, and maintainability while ensuring security and performance standards.