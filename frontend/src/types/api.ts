export interface ApiErrorResponse {
  error?: string;
  message?: string;
  errors?: { message: string }[];
}

export interface AuthResponse {
  user: { user_metadata?: { display_name?: string; full_name?: string; avatar_url?: string | null; bio?: string }; id: string; email?: string; created_at?: string; last_sign_in_at?: string; email_confirmed_at?: string };
}

export interface RegisterResponse {
  user: AuthResponse["user"] | null;
  confirmationRequired: boolean;
}

export interface PublicProfile { name: string; avatar_url: string | null; bio?: string | null }
