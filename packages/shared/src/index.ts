// ─── Enums ───────────────────────────────────────────────────────────

export type CIProvider = 'github_actions' | 'gitlab_ci' | 'jenkins' | 'circleci' | 'argocd' | 'custom';

export type BuildStatus = 'pending' | 'building' | 'success' | 'failed' | 'cancelled';

export type DeploymentStatus = 'queued' | 'in_progress' | 'success' | 'failed' | 'rolled_back' | 'cancelled';

export type DeployStrategy = 'rolling' | 'blue_green' | 'canary' | 'recreate';

export type RollbackCategory = 'automated' | 'manual' | 'incident' | 'config_error' | 'performance';

export type RollbackStatus = 'in_progress' | 'success' | 'failed';

export type ArtifactType = 'docker_image' | 'binary' | 'package' | 'lambda_zip';

export type UserRole = 'admin' | 'deployer' | 'viewer';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export type AlertEventType = 'deploy_started' | 'deploy_success' | 'deploy_failed' | 'rollback_initiated' | 'rollback_completed' | 'health_check_failed';

// ─── Entities ────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  repoUrl: string;
  ciProvider: CIProvider;
  ciConfig: Record<string, unknown>;
  createdAt: string;
  // Relations
  environments?: Environment[];
  builds?: Build[];
}

export interface Environment {
  id: string;
  projectId: string;
  name: string;
  order: number;
  isProduction: boolean;
  healthCheckUrl?: string;
  createdAt: string;
  // Relations
  currentDeployment?: Deployment;
  deployments?: Deployment[];
}

export interface Build {
  id: string;
  projectId: string;
  buildNumber: number;
  commitSha: string;
  branch: string;
  author: string;
  message: string;
  ciBuildId?: string;
  ciBuildUrl?: string;
  status: BuildStatus;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
  // Relations
  artifacts?: Artifact[];
}

export interface Artifact {
  id: string;
  buildId: string;
  name: string;
  type: ArtifactType;
  registryUrl?: string;
  sizeBytes?: number;
  checksum?: string;
  createdAt: string;
}

export interface Deployment {
  id: string;
  projectId: string;
  environmentId: string;
  buildId: string;
  artifactId?: string;
  initiatedBy: string;
  status: DeploymentStatus;
  strategy: DeployStrategy;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  // Relations
  environment?: Environment;
  build?: Build;
  artifact?: Artifact;
  initiator?: User;
  rollbacks?: Rollback[];
}

export interface Rollback {
  id: string;
  deploymentId: string;
  rollbackToDeploymentId: string;
  initiatedBy: string;
  reason: string;
  category: RollbackCategory;
  status: RollbackStatus;
  startedAt: string;
  finishedAt?: string;
  createdAt: string;
  // Relations
  deployment?: Deployment;
  targetDeployment?: Deployment;
  initiator?: User;
}

export interface DeploymentLog {
  id: string;
  deploymentId: string;
  level: LogLevel;
  message: string;
  timestamp: string;
}

export interface User {
  id: string;
  orgId: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface AlertRule {
  id: string;
  projectId: string;
  name: string;
  condition: Record<string, unknown>;
  channels: string[];
  enabled: boolean;
  createdAt: string;
}

export interface AlertEvent {
  id: string;
  alertRuleId: string;
  deploymentId: string;
  payload: Record<string, unknown>;
  delivered: boolean;
  createdAt: string;
}

// ─── API Types ───────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

// ─── DORA Metrics ────────────────────────────────────────────────────

export interface DORAMetrics {
  deploymentFrequency: {
    value: number;
    unit: 'per_day' | 'per_week';
    trend: number; // percentage change
    rating: 'elite' | 'high' | 'medium' | 'low';
  };
  leadTimeForChanges: {
    value: number; // minutes
    trend: number;
    rating: 'elite' | 'high' | 'medium' | 'low';
  };
  meanTimeToRecovery: {
    value: number; // minutes
    trend: number;
    rating: 'elite' | 'high' | 'medium' | 'low';
  };
  changeFailureRate: {
    value: number; // percentage
    trend: number;
    rating: 'elite' | 'high' | 'medium' | 'low';
  };
}

// ─── Dashboard Types ─────────────────────────────────────────────────

export interface EnvironmentHealth {
  projectId: string;
  projectName: string;
  environments: {
    envId: string;
    envName: string;
    status: 'healthy' | 'deploying' | 'failed' | 'stale' | 'unknown';
    lastDeployment?: Deployment;
    lastDeployedAt?: string;
  }[];
}

export interface ActivityEvent {
  id: string;
  type: 'deployment' | 'rollback' | 'build' | 'alert';
  title: string;
  description: string;
  status: string;
  project: string;
  environment?: string;
  actor: string;
  timestamp: string;
}

export interface DeploymentHeatmapDay {
  date: string;
  count: number;
  successCount: number;
  failedCount: number;
}

// ─── WebSocket Events ────────────────────────────────────────────────

export interface WSEvents {
  'deployment:created': Deployment;
  'deployment:updated': Deployment;
  'rollback:created': Rollback;
  'rollback:updated': Rollback;
  'build:updated': Build;
  'activity:new': ActivityEvent;
}

// ─── Constants ───────────────────────────────────────────────────────

export const DEPLOYMENT_STATUS_COLORS: Record<DeploymentStatus, string> = {
  queued: '#94a3b8',
  in_progress: '#3b82f6',
  success: '#10b981',
  failed: '#ef4444',
  rolled_back: '#f59e0b',
  cancelled: '#6b7280',
};

export const BUILD_STATUS_COLORS: Record<BuildStatus, string> = {
  pending: '#94a3b8',
  building: '#3b82f6',
  success: '#10b981',
  failed: '#ef4444',
  cancelled: '#6b7280',
};

export const DEPLOYMENT_STATUS_ICONS: Record<DeploymentStatus, string> = {
  queued: '⏳',
  in_progress: '🔄',
  success: '✅',
  failed: '🔴',
  rolled_back: '↩️',
  cancelled: '⚪',
};

export const ENVIRONMENT_ORDER = ['development', 'staging', 'canary', 'production'] as const;
