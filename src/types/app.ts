export type AppEnv = {
  Variables: {
    user: { id: string; email: string };
    tenantId: string;
    tenantRole: 'admin' | 'editor' | 'viewer';
    jwtPayload: Record<string, unknown>;
    requestId: string;
  };
};
