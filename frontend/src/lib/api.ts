import type { ApiErrorResponse, AuthResponse, RegisterResponse } from "@/types/api";
import type { Booking, NewBooking } from "@/types/booking";
import type { Property, PropertyInput } from "@/types/property";

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!response.ok) {
    const body: ApiErrorResponse = await response.json().catch(() => ({}));
    throw new ApiError(body.error || body.message || body.errors?.map(issue => issue.message).join(" ") || `Request failed (${response.status})`, response.status);
  }
  return response.json() as Promise<T>;
}

export const getProperties = () => request<Property[]>("/properties");
export const createProperty = (property: PropertyInput) => request<Property>("/properties", {
  method: "POST", body: JSON.stringify(property),
});
export const deleteProperty = (id: string) => request<{ message: string; property: Property; cancelled_bookings: number }>(`/properties/${encodeURIComponent(id)}`, { method: "DELETE" });
export const getProperty = (id: string) => request<Property>(`/properties/${encodeURIComponent(id)}`);
export const updateProperty = (id: string, property: PropertyInput) => request<Property>(`/properties/${encodeURIComponent(id)}`, {
  method: "PATCH", body: JSON.stringify(property),
});
export const updateBooking = (id: string, booking: NewBooking & { status: Booking["status"] }) => request<Booking>(`/bookings/${encodeURIComponent(id)}`, {
  method: "PUT", body: JSON.stringify(booking),
});
export const getBookings = () => request<Booking[]>("/bookings");
export const getPropertyBookings = (id: string) => request<Booking[]>(`/bookings?property_id=${encodeURIComponent(id)}`);
export const confirmBooking = (id: string) => request<Booking>(`/bookings/${encodeURIComponent(id)}/confirm`, { method: "POST" });
export const cancelBooking = (id: string) => request<Booking>(`/bookings/${encodeURIComponent(id)}/cancel`, {
  method: "POST",
});
export const createBooking = (booking: NewBooking) => request<Booking>("/bookings", {
  method: "POST", body: JSON.stringify(booking),
});
export const login = (email: string, password: string) => request<AuthResponse>("/auth/login", {
  method: "POST", body: JSON.stringify({ email, password }),
});
export const getCurrentUser = () => request<AuthResponse>("/auth/me");
export const deleteAccount = (password: string) => request<{ message: string }>("/auth/account", {
  method: "DELETE", body: JSON.stringify({ password }),
});
export const register = (email: string, password: string) => request<RegisterResponse>("/auth/register", {
  method: "POST", body: JSON.stringify({ email, password }),
});
export const logout = () => request<{ message: string }>("/auth/logout", { method: "POST" });
