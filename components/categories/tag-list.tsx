"use client";

import * as React from "react";
import {
  Tag as TagIcon,
  Plus,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createTagAction,
  updateTagAction,
  deleteTagAction,
} from "@/app/(dashboard)/categories/actions";

const COLOR_PRESETS = [
  "#376FE5", // Accent Blue
  "#16865B", // Income Emerald
  "#D94D5C", // Expense Red
  "#B77B19", // Warning Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#64748B", // Slate
];

interface TagListProps {
  initialTags?: Tables<"tags">[];
}

export function TagList({ initialTags = [] }: TagListProps) {
  const [tags, setTags] = React.useState<Tables<"tags">[]>(initialTags);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingTag, setEditingTag] = React.useState<Tables<"tags"> | null>(null);

  // Form states
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState("#376FE5");
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (initialTags.length > 0) {
      setTags(initialTags);
    }
  }, [initialTags]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Tag name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createTagAction({
        name: name.trim(),
        color,
        description: description.trim() || null,
      });

      if (res.success && res.data) {
        toast.success("Tag created successfully");
        setTags((prev) => [...prev, res.data as Tables<"tags">].sort((a, b) => a.name.localeCompare(b.name)));
        setName("");
        setDescription("");
        setIsCreateOpen(false);
      } else {
        toast.error(res.error || "Failed to create tag");
      }
    } catch {
      toast.error("Unexpected error creating tag");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag || !name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await updateTagAction({
        id: editingTag.id,
        name: name.trim(),
        color,
        description: description.trim() || null,
      });

      if (res.success && res.data) {
        toast.success("Tag updated");
        setTags((prev) =>
          prev.map((t) => (t.id === editingTag.id ? (res.data as Tables<"tags">) : t))
        );
        setEditingTag(null);
        setName("");
        setDescription("");
      } else {
        toast.error(res.error || "Failed to update tag");
      }
    } catch {
      toast.error("Unexpected error updating tag");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (tag: Tables<"tags">) => {
    if (!confirm(`Are you sure you want to delete tag "${tag.name}"?`)) return;

    try {
      const res = await deleteTagAction(tag.id);
      if (res.success) {
        toast.success("Tag deleted");
        setTags((prev) => prev.filter((t) => t.id !== tag.id));
      } else {
        toast.error(res.error || "Failed to delete tag");
      }
    } catch {
      toast.error("Error deleting tag");
    }
  };

  const handleToggleArchive = async (tag: Tables<"tags">) => {
    const nextArchived = !tag.is_archived;
    try {
      const res = await updateTagAction({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        is_archived: nextArchived,
      });
      if (res.success) {
        toast.success(nextArchived ? "Tag archived" : "Tag restored");
        setTags((prev) =>
          prev.map((t) => (t.id === tag.id ? { ...t, is_archived: nextArchived } : t))
        );
      }
    } catch {
      toast.error("Error updating tag archive status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Custom Tags</h2>
          <p className="text-sm text-muted-foreground">
            Apply flexible, cross-category tags to group, search, and analyze transactions.
          </p>
        </div>

        {/* Create Tag Trigger */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary-hover font-mono text-xs"
              onClick={() => {
                setName("");
                setColor("#376FE5");
                setDescription("");
              }}
            >
              <Plus className="h-4 w-4" />
              <span>Create Tag</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle className="font-mono text-base">New Custom Tag</DialogTitle>
                <DialogDescription className="text-xs">
                  Create a label to cross-reference multiple transactions across accounts.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4 text-xs font-mono">
                <div className="space-y-1.5">
                  <Label htmlFor="tag-name">Tag Name</Label>
                  <Input
                    id="tag-name"
                    placeholder="e.g. Vacation 2026, Tax-Deductible, Project X"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tag-desc">Description (Optional)</Label>
                  <Input
                    id="tag-desc"
                    placeholder="Brief notes about how this tag is used"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Tag Color</Label>
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        style={{ backgroundColor: c }}
                        className="h-7 w-7 rounded-full transition-transform flex items-center justify-center text-white"
                      >
                        {color === c && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Create Tag
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tags Grid / List */}
      {tags.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <TagIcon className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
          <h3 className="text-sm font-semibold text-foreground">No tags created yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Tags allow you to organize transactions across categories (e.g., #reimbursable, #vacation, #diwali).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                tag.is_archived
                  ? "bg-muted/30 border-dashed border-border opacity-60"
                  : "bg-card border-border hover:border-primary/40 shadow-xs"
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold"
                    style={{
                      backgroundColor: `${tag.color}15`,
                      color: tag.color,
                      border: `1px solid ${tag.color}35`,
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    #{tag.name}
                  </span>

                  {tag.is_archived && (
                    <Badge variant="outline" className="text-[9px] uppercase font-mono">
                      Archived
                    </Badge>
                  )}
                </div>

                {tag.description && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {tag.description}
                  </p>
                )}
              </div>

              {/* Tag Action Controls */}
              <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/40">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setEditingTag(tag);
                    setName(tag.name);
                    setColor(tag.color || "#376FE5");
                    setDescription(tag.description || "");
                  }}
                  title="Edit tag"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => handleToggleArchive(tag)}
                  title={tag.is_archived ? "Restore tag" : "Archive tag"}
                >
                  {tag.is_archived ? (
                    <RotateCcw className="h-3.5 w-3.5" />
                  ) : (
                    <Archive className="h-3.5 w-3.5" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(tag)}
                  title="Delete tag"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Tag Dialog */}
      <Dialog open={!!editingTag} onOpenChange={(open) => !open && setEditingTag(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle className="font-mono text-base">Edit Tag</DialogTitle>
              <DialogDescription className="text-xs">
                Update tag label and styling.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs font-mono">
              <div className="space-y-1.5">
                <Label htmlFor="edit-tag-name">Tag Name</Label>
                <Input
                  id="edit-tag-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-tag-desc">Description</Label>
                <Input
                  id="edit-tag-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tag Color</Label>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className="h-7 w-7 rounded-full transition-transform flex items-center justify-center text-white"
                    >
                      {color === c && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingTag(null)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
