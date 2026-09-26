-- =====================================================================
-- ILRDVS - Intelligent Land Record Digitization & Validation System
-- Smart India Hackathon 2026 (Problem Statement ID: 26018)
-- Ministry of Rural Development - Department of Land Resources (DoLR)
-- Master Relational Schema & Row Level Security (RLS) Policies
-- =====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Attempt PostGIS extension (if enabled on the database tier)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS postgis;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'PostGIS not available or permission restricted; GeoJSON will be stored as JSONB.';
END $$;

-- 2. Custom Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'REVENUE_OFFICER', 'VERIFICATION_CLERK', 'GIS_SPECIALIST', 'AUDITOR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE document_status AS ENUM ('PENDING', 'PREPROCESSING', 'OCR_PROCESSING', 'EXTRACTED', 'VALIDATED', 'REQUIRES_REVIEW', 'VERIFIED', 'FAILED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE record_status AS ENUM ('PENDING_VERIFICATION', 'REQUIRES_VERIFICATION', 'VERIFIED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE rule_status AS ENUM ('PASSED', 'WARNING', 'FAILED', 'NOT_CHECKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE confidence_tier AS ENUM ('HIGH', 'REVIEW', 'LOW');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- 3. RBAC: Roles and Permissions
-- =====================================================================

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'VERIFICATION_CLERK',
    department VARCHAR(100) DEFAULT 'Department of Land Resources',
    jurisdiction_state VARCHAR(100),
    jurisdiction_district VARCHAR(100),
    jurisdiction_taluk VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 4. Document Ingestion, Pages & Processing Jobs
-- =====================================================================

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_path TEXT NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    taluk VARCHAR(100) NOT NULL,
    village VARCHAR(100) NOT NULL,
    document_type VARCHAR(50) DEFAULT 'PATTA',
    language VARCHAR(50) DEFAULT 'en',
    status document_status DEFAULT 'PENDING',
    is_classified_as_land BOOLEAN DEFAULT TRUE,
    document_category VARCHAR(50) DEFAULT 'PATTA_LAND_RECORD',
    rejection_reason TEXT,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number INT NOT NULL DEFAULT 1,
    image_path TEXT NOT NULL,
    width INT,
    height INT,
    dpi INT DEFAULT 300,
    is_deskewed BOOLEAN DEFAULT FALSE,
    deskew_angle NUMERIC(5, 2) DEFAULT 0.00,
    is_denoised BOOLEAN DEFAULT FALSE,
    contrast_enhanced BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
    current_stage VARCHAR(50) DEFAULT 'INIT',
    progress_percent INT DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 5. OCR Results, Tokens & Extracted Entities
-- =====================================================================

CREATE TABLE IF NOT EXISTS ocr_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_id UUID REFERENCES document_pages(id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL,
    detected_language VARCHAR(50) NOT NULL,
    overall_confidence NUMERIC(5, 4) NOT NULL,
    engine VARCHAR(100) NOT NULL DEFAULT 'Tesseract.js / Indic-HTR',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ocr_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ocr_result_id UUID NOT NULL REFERENCES ocr_results(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    transliteration TEXT,
    meaning TEXT,
    confidence NUMERIC(5, 4) NOT NULL,
    field_tag VARCHAR(50),
    bbox_x NUMERIC(6, 2) NOT NULL,
    bbox_y NUMERIC(6, 2) NOT NULL,
    bbox_w NUMERIC(6, 2) NOT NULL,
    bbox_h NUMERIC(6, 2) NOT NULL,
    page_number INT DEFAULT 1,
    line_number INT,
    word_number INT,
    character_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS extracted_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_value TEXT NOT NULL,
    normalized_value TEXT,
    confidence NUMERIC(5, 4) NOT NULL,
    bbox_coords JSONB,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 6. Digitized Land Records, Versions & Validation Results
-- =====================================================================

CREATE TABLE IF NOT EXISTS land_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    survey_number VARCHAR(100) NOT NULL,
    subdivision_number VARCHAR(50),
    patta_number VARCHAR(100),
    khasra_number VARCHAR(100),
    khata_number VARCHAR(100),
    owner_name VARCHAR(255) NOT NULL,
    father_name VARCHAR(255),
    land_area NUMERIC(12, 4) NOT NULL,
    area_unit VARCHAR(50) NOT NULL DEFAULT 'acre',
    land_type VARCHAR(50) DEFAULT 'Agricultural',
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    taluk VARCHAR(100) NOT NULL,
    village VARCHAR(100) NOT NULL,
    ulpin VARCHAR(14),
    status record_status DEFAULT 'REQUIRES_VERIFICATION',
    confidence_tier confidence_tier DEFAULT 'REVIEW',
    overall_confidence NUMERIC(5, 4) NOT NULL DEFAULT 0.8500,
    field_confidences JSONB,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS land_record_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    land_record_id UUID NOT NULL REFERENCES land_records(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    changed_fields JSONB NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    land_record_id UUID NOT NULL REFERENCES land_records(id) ON DELETE CASCADE,
    overall_status VARCHAR(50) NOT NULL DEFAULT 'REQUIRES_VERIFICATION',
    rules_passed_count INT NOT NULL DEFAULT 0,
    rules_warning_count INT NOT NULL DEFAULT 0,
    rules_failed_count INT NOT NULL DEFAULT 0,
    execution_time_ms INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS validation_rule_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    validation_result_id UUID NOT NULL REFERENCES validation_results(id) ON DELETE CASCADE,
    rule_id VARCHAR(50) NOT NULL,
    rule_name VARCHAR(100) NOT NULL,
    status rule_status NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    message TEXT NOT NULL,
    evidence TEXT,
    field_affected VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 7. Cadastral GIS Parcels, Vertices & ULPIN Records
-- =====================================================================

CREATE TABLE IF NOT EXISTS parcels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_number VARCHAR(100) NOT NULL,
    subdivision VARCHAR(50),
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    taluk VARCHAR(100) NOT NULL,
    village VARCHAR(100) NOT NULL,
    declared_area NUMERIC(12, 4) NOT NULL,
    measured_area NUMERIC(12, 4) NOT NULL,
    area_unit VARCHAR(50) DEFAULT 'acre',
    centroid_lat NUMERIC(10, 7) NOT NULL,
    centroid_lng NUMERIC(10, 7) NOT NULL,
    geometry_geojson JSONB NOT NULL,
    ulpin VARCHAR(14) UNIQUE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parcel_vertices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    sequence_order INT NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL
);

CREATE TABLE IF NOT EXISTS ulpin_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ulpin VARCHAR(14) UNIQUE NOT NULL,
    parcel_id UUID REFERENCES parcels(id) ON DELETE CASCADE,
    land_record_id UUID REFERENCES land_records(id) ON DELETE SET NULL,
    state_code VARCHAR(10) NOT NULL,
    district_code VARCHAR(10) NOT NULL,
    subdistrict_code VARCHAR(10) NOT NULL,
    village_code VARCHAR(10) NOT NULL,
    parcel_unique_id VARCHAR(10) NOT NULL,
    check_digit VARCHAR(2) NOT NULL,
    status VARCHAR(50) DEFAULT 'ISSUED',
    is_demo BOOLEAN DEFAULT TRUE,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    issued_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================================
-- 8. Verification Tasks, Actions & Active Learning Feedback
-- =====================================================================

CREATE TABLE IF NOT EXISTS verification_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    land_record_id UUID NOT NULL REFERENCES land_records(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES verification_tasks(id) ON DELETE SET NULL,
    land_record_id UUID NOT NULL REFERENCES land_records(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,
    field_modified VARCHAR(50),
    previous_value TEXT,
    new_value TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    land_record_id UUID REFERENCES land_records(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    field_name VARCHAR(50) NOT NULL,
    original_prediction TEXT NOT NULL,
    corrected_value TEXT NOT NULL,
    model_name VARCHAR(100) DEFAULT 'TrOCR-Indic / Tesseract.js',
    confidence NUMERIC(5, 4),
    correction_reason TEXT NOT NULL,
    corrected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 9. Comprehensive Immutable Audit Trail Ledger
-- =====================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
    actor_name VARCHAR(255) NOT NULL DEFAULT 'System Agent',
    actor_role VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    before_state JSONB,
    after_state JSONB,
    diff JSONB,
    remarks TEXT,
    ip_address VARCHAR(50) DEFAULT '127.0.0.1',
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 10. Indic Datasets & Benchmark Laboratory
-- =====================================================================

CREATE TABLE IF NOT EXISTS datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id VARCHAR(150) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    language VARCHAR(100) NOT NULL,
    lang_code VARCHAR(20) NOT NULL,
    task_type VARCHAR(100) NOT NULL,
    cer_benchmark VARCHAR(20),
    wer_benchmark VARCHAR(20),
    sample_count INT DEFAULT 1000,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS benchmark_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    run_name VARCHAR(255) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    cer_result NUMERIC(6, 4) NOT NULL,
    wer_result NUMERIC(6, 4) NOT NULL,
    field_accuracy NUMERIC(6, 4) NOT NULL,
    samples_processed INT NOT NULL DEFAULT 0,
    execution_time_ms INT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS benchmark_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    benchmark_run_id UUID REFERENCES benchmark_runs(id) ON DELETE CASCADE,
    sample_id VARCHAR(100) NOT NULL,
    ground_truth TEXT NOT NULL,
    predicted_text TEXT NOT NULL,
    cer NUMERIC(6, 4) NOT NULL,
    wer NUMERIC(6, 4) NOT NULL,
    is_correct BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 11. System Settings & Notifications
-- =====================================================================

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'INFO',
    is_read BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 12. Indexes for High-Performance Queries
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_checksum ON documents(checksum_sha256);
CREATE INDEX IF NOT EXISTS idx_documents_state_dist ON documents(state, district, taluk, village);
CREATE INDEX IF NOT EXISTS idx_land_records_survey ON land_records(survey_number);
CREATE INDEX IF NOT EXISTS idx_land_records_village ON land_records(state, district, taluk, village);
CREATE INDEX IF NOT EXISTS idx_land_records_status ON land_records(status);
CREATE INDEX IF NOT EXISTS idx_parcels_survey ON parcels(survey_number, village);
CREATE INDEX IF NOT EXISTS idx_parcels_ulpin ON parcels(ulpin);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =====================================================================
-- 13. Enable Row Level Security (RLS) on All Tables
-- =====================================================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE land_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE land_record_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_rule_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcel_vertices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ulpin_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Base Permissive Read Policies for Application Service Role & Authenticated Staff
CREATE POLICY "Allow authenticated read documents" ON documents FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert documents" ON documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update documents" ON documents FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated read land_records" ON land_records FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert land_records" ON land_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update land_records" ON land_records FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated read validation" ON validation_results FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert validation" ON validation_results FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated read audit_logs" ON audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert audit_logs" ON audit_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated read parcels" ON parcels FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read datasets" ON datasets FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read benchmarks" ON benchmark_runs FOR SELECT USING (true);

-- =====================================================================
-- 14. Initial Seed Data (Core Roles, Datasets, and System Config)
-- =====================================================================

INSERT INTO roles (name, description) VALUES
    ('SUPER_ADMIN', 'Overall platform administrator with full system permissions'),
    ('REVENUE_OFFICER', 'Authorized to approve land records, certify mutations, and issue Bhu-Aadhaar ULPIN'),
    ('VERIFICATION_CLERK', 'Inspects scanned records, corrects OCR transcription errors, and verifies fields'),
    ('GIS_SPECIALIST', 'Manages cadastral polygons, spatial boundaries, and coordinates'),
    ('AUDITOR', 'Read-only access to immutable audit trails and compliance reports')
ON CONFLICT (name) DO NOTHING;

INSERT INTO datasets (dataset_id, title, language, lang_code, task_type, cer_benchmark, wer_benchmark, sample_count, description) VALUES
    ('c3rl/IIIT-INDIC-HW-WORDS-Hindi', 'IIIT-INDIC Handwritten Words (Hindi)', 'Hindi (हिन्दी / Devanagari)', 'hi', 'Word-Level Indic HTR', '4.2%', '10.4%', 15000, 'Handwritten revenue deed vocabulary for Hindi Devanagari script'),
    ('c3rl/IIIT-INDIC-HW-WORDS-Tamil', 'IIIT-INDIC Handwritten Words (Tamil)', 'Tamil (தமிழ்)', 'ta', 'Word-Level Indic HTR', '4.8%', '11.2%', 12500, 'Handwritten Patta/Chitta vocabulary for Tamil script'),
    ('darknight054/indic-mozhi-ocr', 'Indic Mozhi Multi-Script OCR', 'Assamese, Bengali, Gujarati', 'as,bn,gu', 'Regional Script OCR', '4.3%', '10.8%', 20000, 'Regional land records in East and West Indian scripts'),
    ('Nayana-cognitivelab/NayanaDocs-Indic-45k-webdataset', 'NayanaDocs Indic 45k WebDataset', 'Bengali + Multi-Indic', 'bn', 'Document Layout & VQA', '3.8%', '9.5%', 45000, 'Multi-page document layouts with Visual QA annotations'),
    ('Cognitive-Lab/NayanaOCR_Corpus_2025', 'NayanaOCR Noise & Degradation Corpus', 'Bengali, Arabic, Multilingual', 'bn,ar', 'Degraded Document OCR', '3.6%', '8.9%', 30000, 'Faded ink, water damaged and torn physical paper benchmarks'),
    ('mvbalaji/tamil-ocr-benchmark', 'Tamil Archival Scanned Records', 'Tamil (தமிழ்)', 'ta', 'Archival Document OCR', '3.9%', '9.1%', 8000, 'Century-old land registers from Tamil Nadu Revenue department'),
    ('ashtok897/indic-hplt-v2', 'Indic HPLT v2 Web-Scale Pretraining', '22 Scheduled Indian Languages', 'mul', 'Pretraining Normalization', '3.2%', '7.8%', 100000, 'Web-scale linguistic reference corpus across all official languages')
ON CONFLICT (dataset_id) DO NOTHING;

INSERT INTO system_settings (key, value, description) VALUES
    ('ocr_confidence_threshold_high', '0.90', 'Confidence score equal or above this auto-qualifies for statutory rule execution'),
    ('ocr_confidence_threshold_review', '0.70', 'Confidence score between this and high requires revenue officer review'),
    ('gis_area_tolerance_percent', '15.0', 'Maximum allowable percentage deviation between document area and GIS polygon'),
    ('ulpin_generation_mode', '"LOCAL_DEMO"', 'Mode for ULPIN generator: LOCAL_DEMO or NIC_DOLR_OFFICIAL')
ON CONFLICT (key) DO NOTHING;
