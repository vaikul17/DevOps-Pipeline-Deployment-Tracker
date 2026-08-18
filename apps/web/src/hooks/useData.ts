import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

// ─── Projects ───────────────────────────────────────────────────────

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<{ data: any[] }>('/projects'),
    select: (res) => res.data,
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get<any>(`/projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// ─── Deployments ────────────────────────────────────────────────────

interface DeploymentFilters {
  projectId?: string;
  env?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export function useDeployments(filters: DeploymentFilters = {}) {
  const params = new URLSearchParams();
  if (filters.projectId) params.set('projectId', filters.projectId);
  if (filters.env) params.set('env', filters.env);
  if (filters.status) params.set('status', filters.status);
  params.set('limit', String(filters.limit || 50));
  params.set('offset', String(filters.offset || 0));

  return useQuery({
    queryKey: ['deployments', filters],
    queryFn: () => api.get<{ data: any[]; pagination: any }>(`/deployments?${params}`),
    refetchInterval: 15_000,
  });
}

export function useDeploymentTimeline(projectId: string | undefined, env?: string) {
  const params = new URLSearchParams();
  if (env) params.set('env', env);
  params.set('days', '365');

  return useQuery({
    queryKey: ['timeline', projectId, env],
    queryFn: () => api.get<{ data: any[] }>(`/deployments/project/${projectId}/timeline?${params}`),
    enabled: !!projectId,
    select: (res) => res.data,
  });
}

// ─── Rollbacks ──────────────────────────────────────────────────────

export function useRollbacks(filters: { projectId?: string; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.projectId) params.set('projectId', filters.projectId);
  params.set('limit', String(filters.limit || 20));

  return useQuery({
    queryKey: ['rollbacks', filters],
    queryFn: () => api.get<{ data: any[]; pagination: any }>(`/rollbacks?${params}`),
    refetchInterval: 30_000,
  });
}

export function useTriggerRollback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      api.post(`/rollbacks/${id}`, { reason }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rollbacks'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    },
  });
}

// ─── Analytics ──────────────────────────────────────────────────────

export function useDORAMetrics(projectId?: string) {
  const params = new URLSearchParams();
  if (projectId) params.set('projectId', projectId);
  params.set('days', '30');

  return useQuery({
    queryKey: ['dora', projectId],
    queryFn: () => api.get<any>(`/analytics/dora?${params}`),
    refetchInterval: 60_000,
  });
}

export function useHealthMatrix() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<{ data: any[] }>('/analytics/health'),
    select: (res) => res.data,
    refetchInterval: 30_000,
  });
}

export function useHeatmap(projectId?: string) {
  const params = new URLSearchParams();
  if (projectId) params.set('projectId', projectId);
  params.set('days', '365');

  return useQuery({
    queryKey: ['heatmap', projectId],
    queryFn: () => api.get<{ data: any[] }>(`/analytics/heatmap?${params}`),
    select: (res) => res.data,
  });
}

export function useActivityFeed() {
  return useQuery({
    queryKey: ['activity'],
    queryFn: () => api.get<{ data: any[] }>('/analytics/activity'),
    select: (res) => res.data,
    refetchInterval: 10_000,
  });
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get<any>('/analytics/stats'),
    refetchInterval: 30_000,
  });
}

export function useSyncGitHub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, githubToken }: { id: string; githubToken?: string }) => 
      api.post(`/projects/${id}/sync`, { githubToken }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['deployments', id] });
      queryClient.invalidateQueries({ queryKey: ['timeline', id] });
      queryClient.invalidateQueries({ queryKey: ['heatmap', id] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useSyncVercel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, vercelToken, vercelProjectId, vercelTeamId }: { id: string; vercelToken?: string; vercelProjectId?: string; vercelTeamId?: string }) => 
      api.post(`/projects/${id}/sync/vercel`, { vercelToken, vercelProjectId, vercelTeamId }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['deployments', id] });
      queryClient.invalidateQueries({ queryKey: ['timeline', id] });
      queryClient.invalidateQueries({ queryKey: ['heatmap', id] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    },
  });
}
