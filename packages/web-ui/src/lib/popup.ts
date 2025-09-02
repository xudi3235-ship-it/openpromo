import {
  type PopupRelayMessage,
  popupRelayMessageSchema,
} from "@openpromo/web-api/src/routes/api/popup-relay/constants";

interface OpenPopupProps {
  url: string;
  target?: string;
  width?: number;
  height?: number;
}

/**
 * Open a popup window in the center of the screen
 * @param url
 */
export const openPopup = ({
  url,
  target = "popup",
  width = 600,
  height = 800,
}: OpenPopupProps) => {
  // Fix for dual-screen setups
  const dualScreenLeft =
    window.screenLeft !== undefined ? window.screenLeft : window.screenX;
  const dualScreenTop =
    window.screenTop !== undefined ? window.screenTop : window.screenY;

  const browserWidth = window.innerWidth
    ? window.innerWidth
    : document.documentElement.clientWidth
      ? document.documentElement.clientWidth
      : screen.width;

  const browserHeight = window.innerHeight
    ? window.innerHeight
    : document.documentElement.clientHeight
      ? document.documentElement.clientHeight
      : screen.height;

  const left = (browserWidth - width) / 2 + dualScreenLeft;
  const top = (browserHeight - height) / 2 + dualScreenTop;

  const popup = window.open(
    url,
    target,
    `width=${width},height=${height},left=${left},top=${top}`,
  );

  if (popup) {
    popup.focus();
  }

  return popup;
};

export const handlePopupMessage = (
  event: MessageEvent<unknown>,
  eventToListen: PopupRelayMessage["payload"]["event"],
) => {
  if (event.origin !== window.location.origin) return;

  const result = popupRelayMessageSchema.safeParse(event.data);
  if (!result.success) return;

  const { source, payload } = result.data;
  if (source !== "openpromo") return;
  if (payload.event !== eventToListen) return;

  return payload;
};
