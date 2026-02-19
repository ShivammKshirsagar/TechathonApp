CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    pan_hash TEXT,                -- store hashed PAN
    aadhaar_hash TEXT,            -- store hashed Aadhaar
    kyc_status TEXT CHECK (kyc_status IN ('pending','verified','failed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE agent_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    current_stage TEXT CHECK (
        current_stage IN ('sales','verification','underwriting','awaiting_salary','completed')
    ),
    status TEXT CHECK (
        status IN ('active','closed','error')
    ),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE agent_states (
    thread_id UUID PRIMARY KEY REFERENCES agent_threads(id) ON DELETE CASCADE,
    state_json JSONB NOT NULL,
    last_node TEXT,
    reflection_count INT DEFAULT 0,
    interrupt_signal BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_states_json ON agent_states USING GIN (state_json);

CREATE TABLE loan_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID UNIQUE REFERENCES agent_threads(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),

    loan_type TEXT,
    loan_amount NUMERIC(14,2),
    tenure_months INT,
    purpose TEXT,
    employment_type TEXT,
    monthly_income NUMERIC(12,2),

    application_status TEXT CHECK (
        application_status IN (
            'draft',
            'in_verification',
            'underwriting',
            'approved',
            'rejected',
            'manual_review'
        )
    ) DEFAULT 'draft',

    risk_score NUMERIC(5,2),
    approved_amount NUMERIC(14,2),
    interest_rate NUMERIC(5,2),

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE kyc_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_application_id UUID REFERENCES loan_applications(id) ON DELETE CASCADE,
    verification_method TEXT,  -- otp / document / external_api
    verification_status TEXT CHECK (
        verification_status IN ('pending','verified','failed')
    ),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE credit_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_application_id UUID REFERENCES loan_applications(id) ON DELETE CASCADE,
    credit_score INT,
    bureau_name TEXT,
    evaluation_payload JSONB,
    decision TEXT CHECK (
        decision IN ('pass','fail','manual_review')
    ),
    evaluated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE underwriting_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_application_id UUID REFERENCES loan_applications(id) ON DELETE CASCADE,
    decision TEXT CHECK (
        decision IN ('approved','rejected','manual_review')
    ),
    reasoning TEXT,
    model_version TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES agent_threads(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('user','agent','system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conversations_thread ON conversations(thread_id);

CREATE TABLE tool_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES agent_threads(id) ON DELETE CASCADE,
    loan_application_id UUID REFERENCES loan_applications(id),

    tool_name TEXT NOT NULL,
    input_payload JSONB,
    output_payload JSONB,
    execution_status TEXT CHECK (
        execution_status IN ('started','completed','failed')
    ),
    execution_time_ms INT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_application_id UUID REFERENCES loan_applications(id) ON DELETE CASCADE,
    document_type TEXT CHECK (
        document_type IN ('salary_slip','bank_statement','kyc_document')
    ),
    file_path TEXT NOT NULL,
    parsed_data JSONB,
    verification_status TEXT CHECK (
        verification_status IN ('pending','verified','rejected')
    ),
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE interrupts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES agent_threads(id) ON DELETE CASCADE,
    interrupt_type TEXT,
    reason TEXT,
    resolution_status TEXT CHECK (
        resolution_status IN ('pending','resolved')
    ),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_type TEXT,
    entity_id UUID,
    action TEXT,
    performed_by TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
