export type OutputType = 'email' | 'file_note' | 'escalation';

export type AuthSession = {
  token: string;
  email: string;
};

export type GenerateResponseRequest = {
  outputType: OutputType;
  requestText: string;
  claimDetails?: string;
};

export type GenerateResponseResult = {
  responseTypeLabel: string;
  responseText: string;
};

export type SubscriptionStatus = {
  plan: 'free' | 'paid';
  monthlyLimit: number;
  usedThisMonth: number;
  remainingThisMonth: number;
  canGenerate: boolean;
  priceLabel: string;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

async function apiRequest<T>(path: string, init: RequestInit, token?: string): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('Missing EXPO_PUBLIC_API_BASE_URL');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.message ?? 'Request failed');
  }

  return json as T;
}

export async function loginWithEmail(email: string, password: string): Promise<AuthSession> {
  if (!API_BASE_URL) {
    return {
      token: `mock-${Date.now()}`,
      email,
    };
  }

  return apiRequest<AuthSession>(
    '/v1/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
  );
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!API_BASE_URL) {
    return;
  }

  await apiRequest<{ ok: true }>(
    '/v1/auth/password-reset',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
  );
}

export async function generateResponse(
  token: string,
  payload: GenerateResponseRequest
): Promise<GenerateResponseResult> {
  if (!API_BASE_URL) {
    return {
      responseTypeLabel:
        payload.outputType === 'email'
          ? 'Email Response'
          : payload.outputType === 'file_note'
            ? 'File Note'
            : 'Escalation',
      responseText: `Mock generated response:\n\n${payload.requestText}\n\nClaim Details: ${payload.claimDetails ?? 'N/A'}`,
    };
  }

  return apiRequest<GenerateResponseResult>(
    '/v1/generate',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function getSubscriptionStatus(token: string): Promise<SubscriptionStatus> {
  if (!API_BASE_URL) {
    return {
      plan: 'free',
      monthlyLimit: 10,
      usedThisMonth: 0,
      remainingThisMonth: 10,
      canGenerate: true,
      priceLabel: '$49/month',
    };
  }

  return apiRequest<SubscriptionStatus>('/v1/subscription/status', { method: 'GET' }, token);
}

export async function createCheckoutSession(token: string): Promise<{ checkoutUrl: string }> {
  if (!API_BASE_URL) {
    return { checkoutUrl: 'https://stripe.com' };
  }

  return apiRequest<{ checkoutUrl: string }>(
    '/v1/subscription/checkout',
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
    token,
  );
}
