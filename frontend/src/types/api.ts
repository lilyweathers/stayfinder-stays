export interface ApiErrorResponse {
  error?: string;
  message?: string;
  errors?: { message: string }[];
}

export interface AuthResponse {
  user: { id: string; email?: string };
}

export interface RegisterResponse {
  user: AuthResponse["user"] | null;
  confirmationRequired: boolean;
}
