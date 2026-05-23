// Force to Logout functionality

let unauthorizedHandler: (() => void | Promise<void>) | null = null;

export function setUnauthorizedHandler(handler: () => void | Promise<void>) {
  unauthorizedHandler = handler;
}

export async function triggerUnauthorizedLogout() {
  if (unauthorizedHandler) {
    await unauthorizedHandler();
  }
}
