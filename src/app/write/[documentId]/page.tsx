"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import WriteEditor from "@/app/write/_components/WriteEditor";
import WritePanel from "@/app/write/_components/WritePanel";

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

  const handleSaveDocument = async () => {
    if (!document) return;
    setIsSaving(true);
    try {
      const updatedDocument = {
        ...document,
        content: input,
      };

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
    <div className="flex w-full h-screen bg-gray-200 dark:bg-dark-secondary transition-all duration-200">
      <div className="flex w-full h-full overflow-auto justify-center">
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
        />
      </div>
      <WritePanel
        inputText={input}
        setChanges={setChanges}
        selected={selected}
        lastRequest={lastRequest}
        setLastRequest={setLastRequest}
        userId={userId}
        premiumRemainingUses={premiumRemainingUses}
        setPremiumRemainingUses={setPremiumRemainingUses}
        onModelChange={setSelectedModel}
      />
    </div>
  );
}
