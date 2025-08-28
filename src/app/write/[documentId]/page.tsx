"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import WriteEditor from "@/app/write/_components/WriteEditor";
import WritePanel from "@/app/write/_components/WritePanel";
import { useNextStep } from "nextstepjs";
import { ChevronUp, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

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
  const [isMounted, setIsMounted] = useState(false);
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

  // Ensure portal renders only on client and lock body scroll when open
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const body = globalThis.document?.body;
    if (isAssistantOpen) {
      if (body) body.style.overflow = "hidden";
    } else {
      if (body) body.style.overflow = "unset";
    }
    return () => {
      const b = globalThis.document?.body;
      if (b) b.style.overflow = "unset";
    };
  }, [isAssistantOpen]);

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
      {isMounted && typeof window !== "undefined" && globalThis.document?.body &&
        createPortal(
          <button
            type="button"
            onClick={() => setIsAssistantOpen(true)}
            className={`md:hidden fixed bottom-24 right-6 z-40 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 transform ${
              isAssistantOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
            }`}
            aria-label="Open Assistant"
          >
            <ChevronUp className="w-6 h-6" />
          </button>,
          globalThis.document.body
        )}

      {/* Mobile Bottom Sheet */}
      <AnimatePresence>
        {isAssistantOpen && (
          <motion.div
            className="md:hidden fixed inset-0 z-50 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <motion.div
              className="flex-1 bg-black bg-opacity-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAssistantOpen(false)}
            />

            {/* Bottom Sheet Content */}
            <motion.div
              className="bg-white dark:bg-dark-background rounded-t-2xl shadow-xl max-h-[80vh] flex flex-col"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              {/* Handle Bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-gray-300 dark:bg-dark-divider rounded-full" />
              </div>

              {/* Header */}
              <div className="flex justify-between items-center px-4 pb-3 border-b dark:border-dark-divider">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary">
                  Assistant
                </h2>
                <button
                  onClick={() => setIsAssistantOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-colors duration-200"
                  aria-label="Close Assistant"
                >
                  <X size={20} className="text-gray-500 dark:text-dark-textSecondary" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
