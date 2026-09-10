"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

const ONESIGNAL_APP_ID = "58c03778-9ace-4ff9-afdb-f436f1e530c6";
const ONESIGNAL_SAFARI_WEB_ID =
  "web.onesignal.auto.6a76584b-4903-4cb9-b550-82d6a06974fc";
const EXTERNAL_ID_STORAGE_KEY = "linkwe-onesignal-external-id";

type OneSignalSdk = {
  init(options: {
    appId: string;
    safari_web_id: string;
    serviceWorkerPath: string;
    serviceWorkerParam: { scope: string };
    notifyButton: {
      enable: boolean;
      position: "bottom-left" | "bottom-right";
      size: "small" | "medium" | "large";
      colors: { "circle.background": string; "circle.foreground": string };
      text: {
        "tip.state.unsubscribed": string;
        "tip.state.subscribed": string;
        "tip.state.blocked": string;
        "message.prenotify": string;
        "message.action.subscribed": string;
        "message.action.resubscribed": string;
        "message.action.unsubscribed": string;
        "dialog.main.title": string;
        "dialog.main.button.subscribe": string;
        "dialog.main.button.unsubscribe": string;
      };
    };
    welcomeNotification: { title: string; message: string };
  }): Promise<void>;
  login(externalId: string): Promise<void>;
  logout(): Promise<void>;
  Notifications: { requestPermission(): Promise<boolean> };
};

declare global {
  interface Window {
    OneSignalDeferred?: Array<(oneSignal: OneSignalSdk) => void | Promise<void>>;
  }
}

export default function OneSignalProvider() {
  const initialized = useRef(false);
  const sdk = useRef<OneSignalSdk | null>(null);

  useEffect(() => {
    const prompt = () => void sdk.current?.Notifications.requestPermission();
    window.addEventListener("linkwe-push:prompt", prompt);
    return () => window.removeEventListener("linkwe-push:prompt", prompt);
  }, []);

  const initialize = useCallback(() => {
    if (initialized.current) return;
    initialized.current = true;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      sdk.current = OneSignal;
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        safari_web_id: ONESIGNAL_SAFARI_WEB_ID,
        serviceWorkerPath: "/sw.js",
        serviceWorkerParam: { scope: "/" },
        notifyButton: {
          enable: false,
          position: "bottom-left",
          size: "medium",
          colors: {
            "circle.background": "#D4450A",
            "circle.foreground": "#FFFFFF",
          },
          text: {
            "tip.state.unsubscribed": "Turn on LinkWe notifications",
            "tip.state.subscribed": "LinkWe notifications are on",
            "tip.state.blocked": "Notifications are blocked in your browser",
            "message.prenotify": "Tap to receive important LinkWe updates",
            "message.action.subscribed": "Notifications are now on",
            "message.action.resubscribed": "Notifications are now on",
            "message.action.unsubscribed": "Notifications are now off",
            "dialog.main.title": "Manage LinkWe notifications",
            "dialog.main.button.subscribe": "TURN ON",
            "dialog.main.button.unsubscribe": "TURN OFF",
          },
        },
        welcomeNotification: {
          title: "LinkWe notifications are on",
          message: "You’ll receive important updates from LinkWe here.",
        },
      });

      const syncIdentity = async () => { try {
        const response = await fetch("/api/push/identity", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) return;

        const { externalId } = (await response.json()) as {
          externalId: string | null;
        };
        const previousExternalId = window.localStorage.getItem(
          EXTERNAL_ID_STORAGE_KEY,
        );

        if (externalId) {
          await OneSignal.login(externalId);
          window.localStorage.setItem(EXTERNAL_ID_STORAGE_KEY, externalId);
        } else if (previousExternalId) {
          await OneSignal.logout();
          window.localStorage.removeItem(EXTERNAL_ID_STORAGE_KEY);
        }
      } catch (error) {
        console.warn("LinkWe push identity could not be synchronized", error);
      }};

      await syncIdentity();
      window.addEventListener("focus", syncIdentity);
      window.addEventListener("pageshow", syncIdentity);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") void syncIdentity();
      });
    });
  }, []);

  return (
    <Script
      id="onesignal-web-sdk"
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      strategy="afterInteractive"
      onLoad={initialize}
    />
  );
}
