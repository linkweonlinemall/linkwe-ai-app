let deferredPrompt: any = null

export function setDeferredPrompt(prompt: any) {
  deferredPrompt = prompt
}

export function getDeferredPrompt() {
  return deferredPrompt
}

export async function triggerInstall(): Promise<boolean> {
  if (!deferredPrompt) return false
  await deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  return outcome === "accepted"
}
