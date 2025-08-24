import { useEffect, useMemo, useRef, useState } from "react";
import { db, storage } from "@/lib/firebase";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { onValue, push, ref, remove, set } from "firebase/database";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface ChatProps {
  roomId: string;
  currentUserId: string;
  displayName?: string;
}

interface ChatMessage {
  id: string;
  text?: string;
  senderUid: string;
  senderName?: string;
  createdAt: number;
  fileUrl?: string;
  fileType?: string; // "pdf" | "image"
}

export default function Chat({ roomId, currentUserId, displayName }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

  // Access ImgBB API key from environment variables
  const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

  // 🔹 Fetch chat messages
  useEffect(() => {
    const cRef = ref(db, `chats/${roomId}`);
    const unsub = onValue(cRef, (snap) => {
      const obj = snap.val() || {};
      const arr = Object.values(obj) as ChatMessage[];
      setMessages(arr.sort((a, b) => a.createdAt - b.createdAt));
    });
    return () => unsub();
  }, [roomId]);

  // 🔹 Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const canSend = useMemo(() => text.trim().length > 0, [text]);

  // 🔹 Send text message
  const send = async () => {
    if (!canSend) return;
    try {
      const msgRef = push(ref(db, `chats/${roomId}`));
      const msg: ChatMessage = {
        id: msgRef.key!,
        text: text.trim(),
        senderUid: currentUserId,
        senderName: displayName,
        createdAt: Date.now(),
      };
      await set(msgRef, msg);
      setText("");
    } catch (err) {
      console.error("Failed to send message:", err);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  // 🔹 Upload file (PDF → Firebase, Image → ImgBB)
  const sendFile = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "pdf") {
        // ✅ Upload PDF to Firebase Storage
        const fileRef = storageRef(
          storage,
          `chat_uploads/${roomId}/${Date.now()}-${file.name}`
        );
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);

        const msgRef = push(ref(db, `chats/${roomId}`));
        const msg: ChatMessage = {
          id: msgRef.key!,
          senderUid: currentUserId,
          senderName: displayName,
          createdAt: Date.now(),
          fileUrl: url,
          fileType: "pdf",
        };
        await set(msgRef, msg);
      } else if (["jpg", "jpeg", "png", "gif"].includes(ext || "")) {
        // ✅ Upload Image to ImgBB
        if (!IMGBB_API_KEY) {
          toast({
            title: "Error",
            description: "ImgBB API key is missing. Please check your environment configuration.",
            variant: "destructive",
          });
          throw new Error("ImgBB API key is missing");
        }

        const formData = new FormData();
        formData.append("image", file);

        const res = await fetch(
          `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
          {
            method: "POST",
            body: formData,
          }
        );
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error?.message || "ImgBB upload failed");
        }
        const url = data.data.url;

        const msgRef = push(ref(db, `chats/${roomId}`));
        const msg: ChatMessage = {
          id: msgRef.key!,
          senderUid: currentUserId,
          senderName: displayName,
          createdAt: Date.now(),
          fileUrl: url,
          fileType: "image",
        };
        await set(msgRef, msg);
      } else {
        toast({
          title: "Error",
          description: "Unsupported file type. Please upload a PDF or image (JPG, JPEG, PNG, GIF).",
          variant: "destructive",
        });
        throw new Error("Unsupported file type");
      }
    } catch (err) {
      console.error("Upload failed:", err);
      toast({
        title: "Error",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // 🔹 Delete single message (visible for both users)
  const deleteMessage = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    try {
      await remove(ref(db, `chats/${roomId}/${id}`));
      toast({
        title: "Success",
        description: "Message deleted.",
      });
    } catch (err) {
      console.error("Failed to delete message:", err);
      toast({
        title: "Error",
        description: "Failed to delete message. Please try again.",
        variant: "destructive",
      });
    }
  };

  // 🔹 Clear entire chat (for both users)
  const clearChat = async () => {
    if (!confirm("Delete entire conversation?")) return;
    try {
      await remove(ref(db, `chats/${roomId}`));
      toast({
        title: "Success",
        description: "Chat cleared.",
      });
    } catch (err) {
      console.error("Failed to clear chat:", err);
      toast({
        title: "Error",
        description: "Failed to clear chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="rounded-lg border">
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium">Chat room: {roomId}</h3>
        <Button size="sm" variant="outline" onClick={clearChat}>
          Clear chat
        </Button>
      </header>

      {/* Chat Messages */}
      <div className="p-3 space-y-2 max-h-[50vh] overflow-auto">
        {messages.map((m) => {
          const mine = m.senderUid === currentUserId;
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm shadow ${
                  mine ? "bg-primary/10" : "bg-muted"
                }`}
              >
                {/* Sender Name */}
                <div className="text-xs text-muted-foreground">
                  {m.senderName || (mine ? "You" : "Patient/Doctor")}
                </div>

                {/* Text Message */}
                {m.text && <div>{m.text}</div>}

                {/* File Preview */}
                {m.fileUrl && (
                  <div className="mt-2">
                    {m.fileType === "pdf" ? (
                      <a
                        href={m.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        📄 View PDF Report
                      </a>
                    ) : (
                      <img
                        src={m.fileUrl}
                        alt="Uploaded"
                        className="max-h-40 rounded border"
                      />
                    )}
                  </div>
                )}

                {/* Footer (Time + Delete) */}
                <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                  <button
                    className="underline"
                    onClick={() => deleteMessage(m.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            No messages yet. Say hello!
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input + Upload */}
      <div className="p-3 border-t grid gap-2">
        {uploading && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-gray-500 text-sm mt-2">Uploading file...</p>
          </div>
        )}
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="min-h-[60px]"
        />
        <div className="flex justify-between items-center">
          {/* Upload Button */}
          <div>
            <input
              type="file"
              accept="image/*,.pdf"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) sendFile(file);
              }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Upload File"}
            </Button>
          </div>

          {/* Send Button */}
          <Button size="sm" variant="hero" disabled={!canSend} onClick={send}>
            Send
          </Button>
        </div>
      </div>
    </section>
  );
}