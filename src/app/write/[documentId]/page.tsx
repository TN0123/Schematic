"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import WriteEditor from "@/app/write/_components/WriteEditor";
import WritePanel from "@/app/write/_components/WritePanel";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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
      const response = await fetch("/api/documents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: document.id,
          title: document.title,
          content: document.content,
        }),
      });
      if (response.ok) {
        const updatedDoc = await response.json();
        setDocument(updatedDoc);
        setInput(updatedDoc.content);
      }
    } catch (error) {
      console.error("Failed to save document:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex w-full h-screen bg-gray-200 dark:bg-dark-secondary transition-all duration-200">
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/write"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-dark-paper/80 shadow hover:bg-purple-100 dark:hover:bg-purple-900 text-sm font-medium text-purple-700 dark:text-purple-200 transition-all border border-gray-200 dark:border-dark-divider"
          style={{ backdropFilter: "blur(4px)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Documents
        </Link>
      </div>
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
