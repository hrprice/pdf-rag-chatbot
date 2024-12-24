import { useState, useEffect, useRef } from "react";
import { Button, CircularProgress, Input, Typography } from "@mui/material";
import { GREETING_MESSAGE } from "../constants/constants.ts";
import { useAuthContext } from "../state/use-auth-context.tsx";
import { useSnackbar } from "notistack";

enum WebSocketMessageType {
  Info = "info",
  ChatResponse = "chat_response",
  Error = "error",
}

interface WebSocketMessage {
  message_type: WebSocketMessageType;
  content: string;
}

const MessageBox = ({
  content,
  variant,
  loading,
}: {
  content: string;
  variant: "agent" | "user";
  loading: boolean;
}) => {
  return (
    <div
      style={{
        width: "100%",
        marginBlock: "10px",
      }}
    >
      <Typography
        variant="body2"
        fontFamily="sans-serif"
        style={{
          ...{
            borderRadius: "14px",
            paddingBlock: "4px",
            paddingInline: "10px",
            width: "fit-content",
            display: "flex",
            justifyContent: "center",
            maxWidth: "90%",
            whiteSpace: "pre-wrap",
          },
          ...(variant === "agent"
            ? {
                backgroundColor: "whitesmoke",
              }
            : {
                backgroundColor: "dodgerblue",
                color: "white",
                marginLeft: "auto",
              }),
        }}
      >
        {loading ? <CircularProgress size={20} /> : content}
      </Typography>
    </div>
  );
};

const ChatPage = () => {
  const [messages, setMessages] = useState<string[]>([GREETING_MESSAGE]); // To store messages
  const [input, setInput] = useState<string>("");
  const websocketRef = useRef<WebSocket | null>(null);
  const [token, setToken] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuthContext();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const getToken = async () => {
      const tokenResponse = await user?.getIdToken();
      setToken(tokenResponse);
    };
    getToken();
    let websocket: WebSocket;
    if (token) {
      // Initialize WebSocket
      const websocket = new WebSocket(
        `${import.meta.env.VITE_WEBSOCKET_URI}?token=${token}`
      );

      websocketRef.current = websocket;

      websocket.onopen = () => {
        setIsConnected(true);
      };
      websocket.onclose = () => {
        setIsConnected(false);
      };

      // Handle incoming messages
      websocket.onmessage = ({ data }) => {
        setIsLoading(false);
        const jsonData: WebSocketMessage = JSON.parse(data);
        switch (jsonData.message_type) {
          case WebSocketMessageType.ChatResponse: {
            setMessages((prev) => [...prev.slice(0, -1), jsonData.content]);
            break;
          }
          case WebSocketMessageType.Error: {
            enqueueSnackbar(jsonData.content, {
              variant: "error",
              hideIconVariant: true,
              autoHideDuration: null,
            });
            break;
          }
          case WebSocketMessageType.Info:
          default: {
            console.log(jsonData.content);
          }
        }
        if (jsonData.message_type === "chat_response")
          setMessages((prev) => [...prev.slice(0, -1), jsonData.content]);
        else console.log(jsonData);
      };
    }

    // Cleanup WebSocket on component unmount
    return () => {
      websocket?.close();
    };
  }, [enqueueSnackbar, token, user]);

  const sendMessage = () => {
    if (input.trim() && websocketRef.current) {
      setMessages([...messages, input, ""]);
      websocketRef.current.send(input.trim());
      setIsLoading(true);
      setInput("");
    }
  };

  return (
    <div style={{ paddingBlock: "20px", maxWidth: "600px", margin: "auto" }}>
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "10px",
          marginBottom: "20px",
          height: "400px",
          overflowY: "scroll",
        }}
      >
        {messages.map((message, index) => (
          <MessageBox
            key={index}
            variant={index % 2 === 1 ? "user" : "agent"}
            content={message}
            loading={index === messages.length - 1 ? isLoading : false}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{
            flexGrow: 1,
            padding: "10px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              sendMessage();
            }
          }}
          disabled={!isConnected}
          placeholder="Type your message here..."
        />
        <Button
          onClick={sendMessage}
          style={{
            padding: "10px 20px",
            borderRadius: "4px",
            border: "none",
            background: !isConnected || isLoading ? "#ccc" : "#007bff",
            color: !isConnected || isLoading ? "#6c757d" : "#fff",
          }}
          disabled={!isConnected || isLoading}
        >
          Send
        </Button>
      </div>
    </div>
  );
};

export default ChatPage;
