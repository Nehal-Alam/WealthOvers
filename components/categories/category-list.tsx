"use client";

import * as React from "react";
import {
  Folder,
  Plus,
  Pencil,
  Trash2,
  Tag,
  Lock,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Coins,
  Scale,
  CreditCard,
  ArrowLeftRight,
  Archive,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dynamic from "next/dynamic";

const CreateCategoryDialog = dynamic(
  () =>
    import("@/components/categories/create-category-dialog").then(
      (m) => m.CreateCategoryDialog
    ),
  { ssr: false }
);

const EditCategoryDialog = dynamic(
  () =>
    import("@/components/categories/edit-category-dialog").then(
      (m) => m.EditCategoryDialog
    ),
  { ssr: false }
);

const CreateSubcategoryDialog = dynamic(
  () =>
    import("@/components/categories/create-subcategory-dialog").then(
      (m) => m.CreateSubcategoryDialog
    ),
  { ssr: false }
);

import {
  deleteCategoryAction,
  deleteSubcategoryAction,
  updateCategoryAction,
} from "@/app/(dashboard)/categories/actions";

interface CategoryWithSubcategories extends Tables<"categories"> {
  subcategories: Tables<"subcategories">[];
}

interface CategoryListProps {
  categories: CategoryWithSubcategories[];
}

export function CategoryList({ categories }: CategoryListProps) {
  const [activeTab, setActiveTab] = React.useState<string>("expense");
  const [editingCategory, setEditingCategory] = React.useState<Tables<"categories"> | null>(null);
  const [subcatParent, setSubcatParent] = React.useState<Tables<"categories"> | null>(null);

  // Safe delete dialog states
  const [deletingCategory, setDeletingCategory] = React.useState<Tables<"categories"> | null>(null);
  const [reassignTargetId, setReassignTargetId] = React.useState<string>("none");
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);

  const filteredCategories = React.useMemo(() => {
    if (activeTab === "all") return categories;
    return categories.filter((c) => c.type === activeTab);
  }, [categories, activeTab]);

  const availableReassignCategories = React.useMemo(() => {
    if (!deletingCategory) return [];
    return categories.filter(
      (c) => c.id !== deletingCategory.id && c.type === deletingCategory.type
    );
  }, [categories, deletingCategory]);

  const confirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    setIsDeleting(true);
    try {
      const targetId = reassignTargetId === "none" ? null : reassignTargetId;
      const res = await deleteCategoryAction(deletingCategory.id, targetId);
      if (res.success) {
        toast.success(res.message || "Category deleted");
        setDeletingCategory(null);
        setReassignTargetId("none");
      } else {
        toast.error(res.error || "Failed to delete");
      }
    } catch {
      toast.error("Error deleting category");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleArchive = async (cat: Tables<"categories">) => {
    const nextState = !cat.is_archived;
    const res = await updateCategoryAction({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      is_archived: nextState,
    });
    if (res.success) {
      toast.success(nextState ? `Archived "${cat.name}"` : `Restored "${cat.name}"`);
    } else {
      toast.error(res.error || "Failed to update category");
    }
  };

  const handleDeleteSubcategory = async (sub: Tables<"subcategories">) => {
    if (!confirm(`Delete subcategory "${sub.name}"? Transactions will keep their parent category.`)) return;
    const res = await deleteSubcategoryAction(sub.id);
    if (res.success) {
      toast.success(res.message || "Subcategory deleted");
    } else {
      toast.error(res.error || "Failed to delete subcategory");
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "income":
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case "expense":
        return <TrendingDown className="h-4 w-4 text-rose-500" />;
      case "investment":
        return <Coins className="h-4 w-4 text-violet-500" />;
      case "loan":
        return <Scale className="h-4 w-4 text-amber-500" />;
      case "debt":
        return <CreditCard className="h-4 w-4 text-orange-500" />;
      case "transfer":
        return <ArrowLeftRight className="h-4 w-4 text-blue-500" />;
      default:
        return <Folder className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Category Architecture</h2>
          <p className="text-sm text-muted-foreground">
            Manage hierarchical categories and subcategories for accurate classification.
          </p>
        </div>
        <CreateCategoryDialog
          defaultType={
            activeTab === "all"
              ? "expense"
              : (activeTab as any)
          }
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7 max-w-2xl text-xs">
          <TabsTrigger value="expense">Expenses</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="investment">Invest</TabsTrigger>
          <TabsTrigger value="loan">Loans</TabsTrigger>
          <TabsTrigger value="debt">Debt</TabsTrigger>
          <TabsTrigger value="transfer">Transfers</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredCategories.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <Folder className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-semibold">No categories found</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Create a category to begin classifying transactions in this section.
              </p>
              <CreateCategoryDialog
                defaultType={
                  activeTab === "all"
                    ? "expense"
                    : (activeTab as any)
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCategories.map((category) => (
                <Card
                  key={category.id}
                  className={`overflow-hidden border transition-all hover:shadow-md ${
                    category.is_archived ? "opacity-60 bg-muted/20 border-dashed" : ""
                  }`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                          style={{
                            backgroundColor: `${category.color}20`,
                            color: category.color,
                          }}
                        >
                          <Folder className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-1.5 font-semibold">
                            <span>{category.name}</span>
                            {category.is_system && (
                              <Lock className="h-3 w-3 text-muted-foreground/70" />
                            )}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                              {getTypeIcon(category.type)}
                              {category.type}
                            </span>
                            {category.is_system && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                                System
                              </Badge>
                            )}
                            {category.is_archived && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                                Archived
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditingCategory(category)}
                          aria-label="Edit category"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>

                        {!category.is_system && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleToggleArchive(category)}
                            title={category.is_archived ? "Restore category" : "Archive category"}
                          >
                            {category.is_archived ? (
                              <RotateCcw className="h-3.5 w-3.5" />
                            ) : (
                              <Archive className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}

                        {!category.is_system && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              setDeletingCategory(category);
                              setReassignTargetId("none");
                            }}
                            aria-label="Delete category"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2">
                    {category.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {category.description}
                      </p>
                    )}

                    {/* Subcategories */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          Subcategories ({category.subcategories?.length || 0})
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-primary"
                          onClick={() => setSubcatParent(category)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>

                      {category.subcategories && category.subcategories.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {category.subcategories.map((sub) => (
                            <div
                              key={sub.id}
                              className="group inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            >
                              <span>{sub.name}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteSubcategory(sub)}
                                className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                                aria-label={`Delete ${sub.name}`}
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground/60 italic">
                          No subcategories defined
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Safe Category Deletion Dialog with Transaction Reassignment */}
      <Dialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>Delete Category &ldquo;{deletingCategory?.name}&rdquo;</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              To prevent data loss, you can safely reassign all existing transactions to another category before deleting this category.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="space-y-2">
              <label className="font-semibold text-foreground">
                Reassign transactions to:
              </label>
              <Select value={reassignTargetId} onValueChange={setReassignTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    Uncategorized (Set category to None)
                  </SelectItem>
                  {availableReassignCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingCategory(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={confirmDeleteCategory}
              disabled={isDeleting}
            >
              {isDeleting ? "Reassigning & Deleting..." : "Delete & Preserve History"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <EditCategoryDialog
        category={editingCategory}
        open={!!editingCategory}
        onOpenChange={(open) => !open && setEditingCategory(null)}
      />

      {/* Create Subcategory Dialog */}
      <CreateSubcategoryDialog
        parentCategory={subcatParent}
        open={!!subcatParent}
        onOpenChange={(open) => !open && setSubcatParent(null)}
      />
    </div>
  );
}
