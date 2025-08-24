import { useEffect, useRef } from "react";

interface VideoCallProps {
  roomName: string;
  displayName?: string;
}

// Jitsi API types (minimal subset for our use)
interface JitsiMeetAPIOptions {
  roomName: string;
  parentNode: HTMLElement;
  userInfo?: { displayName?: string };
  configOverwrite?: Record<string, unknown>;
  interfaceConfigOverwrite?: Record<string, unknown>;
}

interface JitsiMeetAPI {
  dispose: () => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: JitsiMeetAPIOptions) => JitsiMeetAPI;
  }
}

// Lightweight Jitsi Meet embed without server keys
export default function VideoCall({ roomName, displayName }: VideoCallProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<JitsiMeetAPI | null>(null);

  useEffect(() => {
    let canceled = false;

    function mount() {
      if (!containerRef.current || typeof window.JitsiMeetExternalAPI === "undefined") return;

      const domain = "meet.jit.si";
      const options: JitsiMeetAPIOptions = {
        roomName,
        parentNode: containerRef.current,
        userInfo: { displayName },
        configOverwrite: {
          prejoinPageEnabled: true,
          startWithAudioMuted: true,
        },
        interfaceConfigOverwrite: {
          HIDE_INVITE_MORE_HEADER: true,
        },
      };

      apiRef.current = new window.JitsiMeetExternalAPI!(domain, options);
    }

    if (window.JitsiMeetExternalAPI) {
      mount();
    } else {
      const script = document.createElement("script");
      script.src = "https://meet.jit.si/external_api.js";
      script.async = true;
      script.onload = () => {
        if (!canceled) mount();
      };
      document.body.appendChild(script);
    }

    return () => {
      canceled = true;
      try {
        apiRef.current?.dispose();
      } catch (err) {
        console.error("Error disposing Jitsi API:", err);
      }
    };
  }, [roomName, displayName]);

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="w-full" style={{ height: "70vh" }} />
      <a
        className="underline text-sm text-muted-foreground"
        href={`https://meet.jit.si/${encodeURIComponent(roomName)}`}
        target="_blank"
        rel="noreferrer"
      >
        Open in a new tab
      </a>
    </div>
  );
}
