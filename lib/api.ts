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
  responseType: OutputType;
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
    const today = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    if (payload.outputType === 'email') {
      return {
        responseType: 'email',
        responseTypeLabel: 'Email Response',
        responseText: `Good afternoon Mr. Reynolds,
Thank you for your follow-up regarding the contractor's recommendation for replacement of the electrical system.

Ordinance or Law coverage may apply when code-related upgrades are required as a direct result of repairing covered physical damage from the reported loss. At this time, we have not received documentation from a building authority confirming that a full electrical replacement is required due to damage caused by this event.

To ensure a thorough and objective evaluation, an independent electrical engineer will be assigned to inspect and test the affected system. Once the inspection is completed and the findings are reviewed, we will provide an update regarding next steps.

Best regards,`,
      };
    }

    if (payload.outputType === 'file_note') {
      return {
        responseType: 'file_note',
        responseTypeLabel: 'File Note',
        responseText: `File Note
Date: ${today}
Type of Contact: Insured Phone Call

Summary of Communication:
Insured contacted to inquire about contractor recommendation for full electrical system replacement. No documentation provided at this time.

Investigation Status:
Engineer inspection pending to evaluate electrical system condition.

Next Steps:
Assign independent electrical engineer and review findings.`,
      };
    }

    return {
      responseType: 'escalation',
      responseTypeLabel: 'Escalation Response',
      responseText: `Subject: Claim Status and Investigation Update

Dear Mr. Carter,
Thank you for your correspondence regarding your concerns with the current claim evaluation.

Based on available information, the investigation remains ongoing, and additional evaluation may be necessary to fully assess the reported damages.

Sincerely,`,
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
