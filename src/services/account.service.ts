import { API_URL, authHeaders } from "./api";

export async function deleteAccount(
  password: string,
  confirmation: string
): Promise<void> {
  const response = await fetch(`${API_URL}/account/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ password, confirmation }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete account");
  }
}
