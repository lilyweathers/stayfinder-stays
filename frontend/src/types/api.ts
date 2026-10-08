export interface ApiErrorResponse {
  error?: string;
  message?: string;
}

export interface AuthResponse {
  user: { id: string; email?: string };
}
