-- 3DWorld schema (PostgreSQL / Supabase). Dữ liệu file nằm ở Cloudinary; bảng chỉ giữ metadata + URL.
-- Thời gian lưu dạng epoch milliseconds (BIGINT). JSON lưu dạng TEXT.

CREATE TABLE users (
  id            VARCHAR(40) PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  name          VARCHAR(80)  NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'customer',
  created_at    BIGINT       NOT NULL
);

-- ============ AI Studio (Image → 3D) ============
CREATE TABLE ai_projects (
  id                VARCHAR(40) PRIMARY KEY,
  owner_id          VARCHAR(40) NOT NULL REFERENCES users(id),
  title             VARCHAR(80) NOT NULL,
  visibility        VARCHAR(20) NOT NULL DEFAULT 'private',
  source_mode       VARCHAR(10) NOT NULL DEFAULT 'single',
  active_version_id VARCHAR(40),
  favorite          BOOLEAN     NOT NULL DEFAULT FALSE,
  archived          BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        BIGINT      NOT NULL,
  updated_at        BIGINT      NOT NULL
);
CREATE INDEX idx_ai_projects_owner ON ai_projects(owner_id, updated_at);

CREATE TABLE ai_source_images (
  id            VARCHAR(40) PRIMARY KEY,
  owner_id      VARCHAR(40) NOT NULL REFERENCES users(id),
  project_id    VARCHAR(40),
  storage_key   TEXT        NOT NULL,
  url           TEXT        NOT NULL,
  mime          VARCHAR(40) NOT NULL,
  size_bytes    BIGINT      NOT NULL,
  width         INTEGER     NOT NULL,
  height        INTEGER     NOT NULL,
  original_name VARCHAR(160) NOT NULL,
  checksum      VARCHAR(64) NOT NULL,
  created_at    BIGINT      NOT NULL
);
CREATE INDEX idx_ai_images_owner ON ai_source_images(owner_id, created_at);

CREATE TABLE ai_tasks (
  id               VARCHAR(40) PRIMARY KEY,
  owner_id         VARCHAR(40) NOT NULL REFERENCES users(id),
  project_id       VARCHAR(40) NOT NULL REFERENCES ai_projects(id),
  provider         VARCHAR(20) NOT NULL,
  provider_task_id VARCHAR(120),
  type             VARCHAR(40) NOT NULL,
  status           VARCHAR(30) NOT NULL,
  progress         INTEGER     NOT NULL DEFAULT 0,
  provider_status  VARCHAR(30),
  error_code       VARCHAR(60),
  error_message    TEXT,
  request_key      VARCHAR(80) NOT NULL,
  variant_index    INTEGER     NOT NULL DEFAULT 0,
  config_json      TEXT        NOT NULL,
  image_ids_json   TEXT        NOT NULL,
  credits          INTEGER     NOT NULL,
  price_version    VARCHAR(40) NOT NULL,
  ingest_attempts  INTEGER     NOT NULL DEFAULT 0,
  created_at       BIGINT      NOT NULL,
  updated_at       BIGINT      NOT NULL,
  finished_at      BIGINT,
  last_synced_at   BIGINT,
  CONSTRAINT uq_ai_tasks_request UNIQUE (owner_id, request_key, variant_index)
);
CREATE INDEX idx_ai_tasks_status ON ai_tasks(status);
CREATE INDEX idx_ai_tasks_provider ON ai_tasks(provider_task_id);
CREATE INDEX idx_ai_tasks_project ON ai_tasks(project_id, created_at);

CREATE TABLE ai_versions (
  id                VARCHAR(40) PRIMARY KEY,
  project_id        VARCHAR(40) NOT NULL REFERENCES ai_projects(id),
  parent_version_id VARCHAR(40),
  source_task_id    VARCHAR(40),
  label             VARCHAR(80) NOT NULL,
  metadata_json     TEXT        NOT NULL DEFAULT '{}',
  dims_json         TEXT,
  created_at        BIGINT      NOT NULL
);
CREATE INDEX idx_ai_versions_project ON ai_versions(project_id, created_at);

CREATE TABLE ai_assets (
  id          VARCHAR(40) PRIMARY KEY,
  version_id  VARCHAR(40) NOT NULL REFERENCES ai_versions(id),
  owner_id    VARCHAR(40) NOT NULL REFERENCES users(id),
  kind        VARCHAR(20) NOT NULL,
  format      VARCHAR(20) NOT NULL,
  file_name   VARCHAR(120) NOT NULL,
  storage_key TEXT        NOT NULL,
  url         TEXT        NOT NULL,
  size_bytes  BIGINT      NOT NULL,
  checksum    VARCHAR(64) NOT NULL,
  created_at  BIGINT      NOT NULL
);
CREATE INDEX idx_ai_assets_version ON ai_assets(version_id);

-- Sổ cái tín dụng AI: HOLD (-) khi tạo task, RELEASE (+) khi hoàn, SETTLE (0) khi đã tính phí.
-- NULL task_id không trùng nhau trong UNIQUE nên GRANT/TOPUP không bị chặn.
CREATE TABLE credit_ledger (
  id         VARCHAR(40) PRIMARY KEY,
  owner_id   VARCHAR(40) NOT NULL REFERENCES users(id),
  amount     INTEGER     NOT NULL,
  type       VARCHAR(20) NOT NULL,
  task_id    VARCHAR(40),
  note       TEXT,
  created_at BIGINT      NOT NULL,
  CONSTRAINT uq_ledger_task_type UNIQUE (task_id, type)
);
CREATE INDEX idx_ledger_owner ON credit_ledger(owner_id, created_at);

-- ============ 3D Studio (editor) ============
CREATE TABLE studio_projects (
  id            VARCHAR(40) PRIMARY KEY,
  owner_id      VARCHAR(40) NOT NULL REFERENCES users(id),
  name          VARCHAR(500) NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'draft',
  unit          VARCHAR(10) NOT NULL DEFAULT 'mm',
  preset        VARCHAR(40),
  template_id   VARCHAR(60),
  icon          VARCHAR(40),
  revision      INTEGER     NOT NULL DEFAULT 1,
  scene_key     TEXT        NOT NULL,
  scene_url     TEXT        NOT NULL,
  thumbnail_key TEXT,
  thumbnail_url TEXT,
  deleted       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    BIGINT      NOT NULL,
  updated_at    BIGINT      NOT NULL,
  saved_at      BIGINT      NOT NULL
);
CREATE INDEX idx_studio_projects_owner ON studio_projects(owner_id, updated_at);

CREATE TABLE studio_snapshots (
  id                VARCHAR(40) PRIMARY KEY,
  project_id        VARCHAR(40) NOT NULL REFERENCES studio_projects(id),
  owner_id          VARCHAR(40) NOT NULL REFERENCES users(id),
  code              VARCHAR(20) NOT NULL,
  revision          INTEGER     NOT NULL,
  mesh_hash         VARCHAR(120) NOT NULL,
  dims_json         TEXT        NOT NULL,
  parts             INTEGER     NOT NULL,
  triangles         INTEGER     NOT NULL,
  state             VARCHAR(20) NOT NULL,
  bytes             BIGINT      NOT NULL,
  stl_key           TEXT        NOT NULL,
  stl_url           TEXT        NOT NULL,
  acknowledged_json TEXT        NOT NULL DEFAULT '[]',
  consent_version   VARCHAR(40),
  created_at        BIGINT      NOT NULL,
  CONSTRAINT uq_studio_snapshot_code UNIQUE (project_id, code)
);

-- ============ POD: yêu cầu in dùng chung cho AI Studio + 3D Studio ============
-- Module POD (làm sau) đọc bảng này để báo giá / thanh toán / sản xuất.
CREATE TABLE print_requests (
  id                 VARCHAR(40) PRIMARY KEY,
  code               VARCHAR(30) NOT NULL UNIQUE,
  owner_id           VARCHAR(40) NOT NULL REFERENCES users(id),
  source             VARCHAR(10) NOT NULL,           -- AI | STUDIO
  request_key        VARCHAR(80) NOT NULL,
  ai_version_id      VARCHAR(40),
  studio_project_id  VARCHAR(40),
  studio_snapshot_id VARCHAR(40),
  config_json        TEXT        NOT NULL,
  file_snapshot_json TEXT        NOT NULL,
  status             VARCHAR(40) NOT NULL,
  created_at         BIGINT      NOT NULL,
  updated_at         BIGINT      NOT NULL,
  CONSTRAINT uq_print_request_key UNIQUE (owner_id, request_key)
);
CREATE INDEX idx_print_requests_owner ON print_requests(owner_id, created_at);

CREATE TABLE audit_log (
  id          VARCHAR(40) PRIMARY KEY,
  actor_id    VARCHAR(40),
  action      VARCHAR(60) NOT NULL,
  target_id   VARCHAR(60),
  detail_json TEXT,
  created_at  BIGINT      NOT NULL
);
