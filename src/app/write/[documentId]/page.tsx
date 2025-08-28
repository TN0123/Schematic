"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import WriteEditor from "@/app/write/_components/WriteEditor";
import WritePanel from "@/app/write/_components/WritePanel";
import { useNextStep } from "nextstepjs";
import { MessageSquare, X } from "lucide-react";

import { ChangeMap } from "@/app/write/_components/WriteEditor";
import { ModelType } from "@/app/write/_components/WritePanel";

interface Document {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  userId: string;
}

export default function DocumentEditorPage() {
  const { documentId } = useParams();
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [input, setInput] = useState("");
  const [changes, setChanges] = useState<ChangeMap>({});
  const [selected, setSelected] = useState<string>("");
  const [lastRequest, setLastRequest] = useState<any>(null);
  const [userId, setUserId] = useState<string | undefined>();
  const [premiumRemainingUses, setPremiumRemainingUses] = useState<
    number | null
  >(null);
  const [selectedModel, setSelectedModel] = useState<ModelType>("premium");
  const [isSaving, setIsSaving] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const { startNextStep } = useNextStep();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [mobilePendingChanges, setMobilePendingChanges] = useState<ChangeMap>({});
  const mobileChangeApiRef = useRef<{
    applyChange: (original: string, replacement: string) => void;
    rejectChange: (original: string) => void;
    appendChange: (newText: string) => void;
    acceptAllChanges: () => void;
    rejectAllChanges: () => void;
    setActiveHighlight: (text: string | null) => void;
  } | null>(null);

  useEffect(() => {
    async function checkAndStartTour() {
      try {
        const res = await fetch("/api/user/onboarding-status");
        const data = await res.json();

        if (!data.hasCompletedWriteTour) {
          startNextStep("writeTour");
        }
      } catch (error) {
        console.error("Failed to fetch onboarding status:", error);
      }
    }

    checkAndStartTour();
  }, [startNextStep]);

  useEffect(() => {
    async function fetchUserId() {
      try {
        const res = await fetch("/api/user/onboarding-status");
        const data = await res.json();
        setUserId(data.id);
      } catch (error) {
        console.error("Failed to fetch user id:", error);
      }
    }
    fetchUserId();
  }, []);

  useEffect(() => {
    async function fetchPremiumUsage() {
      try {
        const res = await fetch("/api/user/premium-usage");
        if (res.ok) {
          const data = await res.json();
          setPremiumRemainingUses(data.remainingUses);
        }
      } catch (error) {
        console.error("Failed to fetch premium usage:", error);
      }
    }
    fetchPremiumUsage();
  }, []);

  useEffect(() => {
    async function fetchDocument() {
      if (!documentId) return;
      try {
        const res = await fetch(`/api/documents/${documentId}`);
        if (res.ok) {
          const doc = await res.json();
          setDocument(doc);
          setInput(doc.content);
        } else {
          router.push("/write");
        }
      } catch (error) {
        router.push("/write");
      }
    }
    fetchDocument();
  }, [documentId, router]);

  useEffect(() => {
    if (Object.keys(changes).length > 0 && isImproving) {
      setTimeout(() => {
        setIsImproving(false);
      }, 500);
    }
  }, [changes, isImproving]);

  const handleSaveDocument = async () => {
    if (!document) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/documents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: document.id,
          title: document.title,
          content: input,
        }),
      });

      if (response.ok) {
        const savedDoc = await response.json();
        setDocument(savedDoc);
        setInput(savedDoc.content);
      } else {
        const errorText = await response.text();
        console.error("Failed to save document:", errorText);
        setInput(document.content);
      }
    } catch (error) {
      console.error("Failed to save document:", error);
      setInput(document.content);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (document && input !== document.content) {
      const timeoutId = setTimeout(() => {
        handleSaveDocument();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [input, document?.content]);

  useEffect(() => {
    if (document) {
      setInput(document.content);
    }
  }, [document?.content]);

  return (
    <div className="flex w-full h-[calc(100dvh-64px)] md:h-[100dvh] lg:h-screen overflow-hidden flex-col lg:flex-row bg-gray-200 dark:bg-dark-secondary transition-all duration-200">
      <div className="flex w-full flex-1 lg:h-full overflow-hidden justify-center">
        <WriteEditor
          setInput={setInput}
          changes={changes}
          setSelected={setSelected}
          onChangesAccepted={() => setLastRequest(null)}
          userId={userId}
          premiumRemainingUses={premiumRemainingUses}
          setPremiumRemainingUses={setPremiumRemainingUses}
          selectedModel={selectedModel}
          currentDocument={document}
          onSaveDocument={handleSaveDocument}
          isSaving={isSaving}
          isImproving={isImproving}
          isChatLoading={isChatLoading}
          onRegisterMobileChangeAPI={(api) => {
            mobileChangeApiRef.current = api;
          }}
          onPendingChanges={setMobilePendingChanges}
        />
      </div>
      <WritePanel
        inputText={input}
        setChanges={setChanges}
        selected={selected}
        lastRequest={lastRequest}
        setLastRequest={setLastRequest}
        userId={userId}
        documentId={document?.id}
        premiumRemainingUses={premiumRemainingUses}
        setPremiumRemainingUses={setPremiumRemainingUses}
        onModelChange={setSelectedModel}
        onImproveStart={() => {
          setIsImproving(true);
          setSelected("");
        }}
        onChatLoadingChange={setIsChatLoading}
      />
      {/* Desktop sidebar above; Mobile Assistant Button + Bottom Sheet */}
      {!isAssistantOpen && (
        <button
          type="button"
          onClick={() => setIsAssistantOpen(true)}
          className="lg:hidden fixed right-4 z-[60] inline-flex items-center gap-2 px-4 py-3 rounded-full shadow-lg bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 transition-colors"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
          aria-label="Open Assistant"
        >
          <MessageSquare className="w-5 h-5" />
          Assistant
        </button>
      )}

      {/* Mobile Bottom Sheet */}
      {isAssistantOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setIsAssistantOpen(false)}
          />
          <div className="bg-white dark:bg-dark-background rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-dark-divider p-3 pt-2 max-h-[80vh] h-[75vh] w-full" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)" }}>
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-dark-divider">
              <div className="h-1.5 w-12 bg-gray-300 dark:bg-dark-divider rounded-full mx-auto absolute left-1/2 -translate-x-1/2 -mt-2" />
              <div className="text-sm font-medium text-gray-700 dark:text-dark-textPrimary">Assistant</div>
              <button
                onClick={() => setIsAssistantOpen(false)}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-hover"
                aria-label="Close Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="h-[calc(75vh-44px)] overflow-hidden pb-20">
              <WritePanel
                inputText={input}
                setChanges={setChanges}
                selected={selected}
                lastRequest={lastRequest}
                setLastRequest={setLastRequest}
                userId={userId}
                documentId={document?.id}
                premiumRemainingUses={premiumRemainingUses}
                setPremiumRemainingUses={setPremiumRemainingUses}
                onModelChange={setSelectedModel}
                onImproveStart={() => {
                  setIsImproving(true);
                  setSelected("");
                }}
                onChatLoadingChange={setIsChatLoading}
                variant="mobile"
                changes={mobilePendingChanges}
                applyChange={(original, replacement) => mobileChangeApiRef.current?.applyChange(original, replacement)}
                rejectChange={(original) => mobileChangeApiRef.current?.rejectChange(original)}
                appendChange={(newText) => mobileChangeApiRef.current?.appendChange(newText)}
                acceptAllChanges={() => mobileChangeApiRef.current?.acceptAllChanges()}
                rejectAllChanges={() => mobileChangeApiRef.current?.rejectAllChanges()}
                setActiveHighlight={(text) => mobileChangeApiRef.current?.setActiveHighlight(text)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
