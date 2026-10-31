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
} from "lucide-react";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateCategoryDialog } from "@/components/categories/create-category-dialog";
import { EditCategoryDialog } from "@/components/categories/edit-category-dialog";
import { CreateSubcategoryDialog } from "@/components/categories/create-subcategory-dialog";
import {
  deleteCategoryAction,
  deleteSubcategoryAction,
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

  const filteredCategories = React.useMemo(() => {
    if (activeTab === "all") return categories;
    return categories.filter((c) => c.type === activeTab);
  }, [categories, activeTab]);

  const handleDeleteCategory = async (cat: Tables<"categories">) => {
    if (cat.is_system) {
      toast.error("System categories cannot be deleted");
      return;
    }
    if (!confirm(`Are you sure you want to delete "${cat.name}"? Transactions assigned to it will be set to uncategorized.`)) {
      return;
    }
    const res = await deleteCategoryAction(cat.id);
    if (res.success) {
      toast.success(res.message || "Category deleted");
    } else {
      toast.error(res.error || "Failed to delete");
    }
  };

  const handleDeleteSubcategory = async (sub: Tables<"subcategories">) => {
    if (!confirm(`Delete subcategory "${sub.name}"?`)) return;
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
        return <Coins className="h-4 w-4 text-purple-500" />;
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
            activeTab === "income"
              ? "income"
              : activeTab === "investment"
              ? "investment"
              : "expense"
          }
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          <TabsTrigger value="expense">Expenses</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="investment">Investments</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredCategories.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <Folder className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-semibold">No categories found</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Create a category to begin tracking transactions in this section.
              </p>
              <CreateCategoryDialog
                defaultType={
                  activeTab === "income"
                    ? "income"
                    : activeTab === "investment"
                    ? "investment"
                    : "expense"
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCategories.map((category) => (
                <Card
                  key={category.id}
                  className="overflow-hidden border transition-all hover:shadow-md"
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
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
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteCategory(category)}
                            aria-label="Delete category"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2">
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

