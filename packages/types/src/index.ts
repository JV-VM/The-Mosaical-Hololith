export type RouteSurface = 'public' | 'dashboard' | 'admin' | 'auth';

export type FrontendModuleName =
  | 'public-hub'
  | 'discovery'
  | 'stores'
  | 'catalog'
  | 'pages'
  | 'auth'
  | 'dashboard'
  | 'analytics'
  | 'billing'
  | 'admin'
  | 'shared-ui'
  | 'shared-data';

export type ApiHealthResponse = {
  ok: boolean;
};

export type ApiErrorResponse = {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
  requestId?: string;
};
