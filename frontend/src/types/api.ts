export interface ApiErrorResponse {
  error?: string;
  message?: string;
  errors?: { message: string }[];
}

export interface AuthResponse {
  user: { id: string; email?: string; created_at?: string; last_sign_in_at?: string; email_confirmed_at?: string };
}

export interface RegisterResponse {
  user: AuthResponse["user"] | null;
  confirmationRequired: boolean;
}
