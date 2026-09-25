"use client";

import { useEffect, useRef } from "react";

/**
 * Makes the Android hardware back button (and the browser back button)
 * close something in-app — a modal, a mobile chat conversation, a media
 * viewer — instead of always navigating away from the page or exiting a
 * wrapped PWA. Previously nothing intercepted `popstate`, so from any open
 * modal the very first back-press left the whole page.
 *
 * Usage: call with (isOpen, onClose) inside the component that owns the
 * open/close state. While `isOpen` is true, a history entry is pushed;
 * pressing back pops it and fires `onClose` instead of the browser
 * navigating further back.
 */
export function useBackButtonClose(isOpen: boolean, onClose: () => void) {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ __backButtonGuard: true }, "");
    pushedRef.current = true;

    const handlePopState = () => {
      pushedRef.current = false;
      onClose();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // If we're unmounting/closing for a reason OTHER than the user
      // pressing back (e.g. they clicked "X" or saved), the guard entry
      // we pushed is still sitting in history — clean it up so a later
      // back-press doesn't land on a stale no-op state.
      if (pushedRef.current) {
        pushedRef.current = false;
        window.history.back();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
}
