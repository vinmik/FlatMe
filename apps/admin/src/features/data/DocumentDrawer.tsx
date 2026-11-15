import { isPlainObject, readPath, type DataContainer, type DataDocument } from "@flatme/shared";
import { AlertTriangle, Check, Copy, Lock, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Drawer, ErrorState, Input, Modal, Skeleton, Textarea } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { useDeleteDocument, useDocument, useReplaceDocument } from "./hooks";

export interface DocKey {
  id: string;
  pk: string;
}

const pretty = (v: unknown) => JSON.stringify(v, null, 2);

/** Client-side mirror of the server rules, so mistakes are caught before a round trip. */
export function validateDraft(text: string, key: DocKey, partitionKeyPath: string): { doc: DataDocument } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { error: `Invalid JSON: ${(e as Error).message}` };
  }
  if (!isPlainObject(parsed)) return { error: "The document must be a JSON object" };
  if (parsed.id !== key.id) return { error: `The id can't be changed (must stay "${key.id}")` };
  if (readPath(parsed, partitionKeyPath) !== key.pk) {
    return { error: `The partition key ${partitionKeyPath} can't be changed (must stay "${key.pk}")` };
  }
  return { doc: parsed as DataDocument };
}

function DeleteDocumentModal({
  container,
  docKey,
  open,
  onClose,
  onDeleted,
}: {
  container: string;
  docKey: DocKey;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [typed, setTyped] = useState("");
  const mutation = useDeleteDocument(container);
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);
  const matches = typed.trim() === docKey.id;
  const confirm = () => {
    if (!matches) return;
    mutation.mutate(docKey, { onSuccess: onDeleted });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      tone="danger"
      icon={<AlertTriangle className="size-5" />}
      title="Delete this document permanently?"
      description={
        <>
          This removes <strong className="font-mono text-fg">{container}/{docKey.id}</strong> straight from the database, bypassing app
          logic (no cascades or notifications). This can&apos;t be undone.
        </>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" disabled={!matches} loading={mutation.isPending} icon={<Trash2 className="size-4" />} onClick={confirm}>
            Delete document
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          confirm();
        }}
      >
        <Input
          label="Type the document id to confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={docKey.id}
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
        />
      </form>
    </Modal>
  );
}

export function DocumentDrawer({ container, docKey, onClose }: { container: DataContainer; docKey: DocKey | null; onClose: () => void }) {
  const { data: doc, error, refetch, isFetching } = useDocument(container.name, docKey);
  const save = useReplaceDocument(container.name);
  const [draft, setDraft] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDraft(null);
    setConfirmDelete(false);
  }, [docKey?.id, docKey?.pk, container.name]);

  const json = useMemo(() => (doc ? pretty(doc) : ""), [doc]);
  const check = draft !== null && docKey ? validateDraft(draft, docKey, container.partitionKeyPath) : null;
  const draftError = check && "error" in check ? check.error : undefined;
  const editing = draft !== null;
  const ts = typeof doc?._ts === "number" ? new Date(doc._ts * 1000).toISOString() : null;

  const onSave = () => {
    if (!docKey || !doc || !check || !("doc" in check)) return;
    // Always send the etag we loaded so a concurrent change is rejected rather than overwritten.
    save.mutate({ ...docKey, doc: { ...check.doc, _etag: doc._etag } }, { onSuccess: () => setDraft(null) });
  };

  return (
    <>
      <Drawer
        open={!!docKey}
        onClose={onClose}
        title={docKey ? docKey.id : "Document"}
        subtitle={docKey ? `${container.name} · ${container.partitionKeyPath} = ${docKey.pk}` : undefined}
        footer={
          doc &&
          docKey &&
          (container.writable ? (
            editing ? (
              <>
                <Button variant="secondary" className="mr-auto" icon={<X className="size-4" />} onClick={() => setDraft(null)}>
                  Cancel
                </Button>
                <Button icon={<Check className="size-4" />} disabled={!!draftError} loading={save.isPending} onClick={onSave}>
                  Save document
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="mr-auto text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                  icon={<Trash2 className="size-4" />}
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </Button>
                <Button icon={<Pencil className="size-4" />} onClick={() => setDraft(json)}>
                  Edit JSON
                </Button>
              </>
            )
          ) : (
            <p className="mr-auto flex items-center gap-2 text-sm text-muted">
              <Lock className="size-4" /> The {container.name} container is read-only here.
            </p>
          ))
        }
      >
        {error && !doc ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : !doc ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-72 w-full rounded-brand" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {!container.writable && <Badge icon={<Lock className="size-3" />}>Read-only</Badge>}
              {editing && <Badge tone="warning">Editing</Badge>}
              {ts && <Badge tone="info">Last write {formatDateTime(ts)}</Badge>}
              {!editing && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  icon={copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  onClick={() => {
                    void navigator.clipboard?.writeText(json).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    });
                  }}
                >
                  {copied ? "Copied" : "Copy JSON"}
                </Button>
              )}
            </div>
            {editing ? (
              <>
                <Textarea
                  aria-label="Document JSON"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      onSave();
                    }
                  }}
                  spellCheck={false}
                  rows={22}
                  className="font-mono text-xs leading-relaxed"
                  error={draftError}
                  hint="Full replace. System properties (_rid, _self, _etag, _ts, _attachments) are ignored. Ctrl/⌘+Enter saves."
                />
              </>
            ) : (
              <pre
                aria-label="Document JSON"
                className={`scrollbar-thin max-h-[65vh] overflow-auto rounded-brand border border-line bg-surface-2 p-4 font-mono text-xs leading-relaxed text-fg transition-opacity ${isFetching ? "opacity-70" : ""}`}
              >
                {json}
              </pre>
            )}
          </div>
        )}
      </Drawer>

      {docKey && (
        <DeleteDocumentModal container={container.name} docKey={docKey} open={confirmDelete} onClose={() => setConfirmDelete(false)} onDeleted={onClose} />
      )}
    </>
  );
}
