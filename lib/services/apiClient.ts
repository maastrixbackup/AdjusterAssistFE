import { BASE_URL } from "@/lib/config/apiConfig";
import { getToken } from "@/lib/utils/storage";

export async function apiRequest<T = unknown>(
  endpoint: string,
  method = "GET",
  body: unknown = null,
): Promise<T> {
  const token = await getToken();
  const url = `${BASE_URL}${endpoint}`;

  console.log("[API REQUEST]", { url, method, body });

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: body ? JSON.stringify(body) : null,
  });

  const data = (await response.json().catch(() => ({}))) as T & {
    message?: string;
  };

  console.log("[API RESPONSE]", {
    url,
    method,
    status: response.status,
    ok: response.ok,
    data,
  });

  if (!response.ok) {
    throw new Error(data?.message ?? "Request failed");
  }

  return data as T;
}
