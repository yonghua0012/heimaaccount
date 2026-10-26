import { useEffect, useMemo, useState } from "react";
import type { Category } from "../types/domain";

interface CategoryPickerProps {
  categories: Category[];
  value: string | null;
  onChange: (categoryId: string) => void;
  recentIds: string[];
}

export function CategoryPicker({
  categories,
  value,
  onChange,
  recentIds,
}: CategoryPickerProps) {
  const parents = categories.filter(
    (item) => item.parentId === null && item.active,
  );
  const selected = categories.find((item) => item.id === value) ?? null;
  const [parentId, setParentId] = useState(
    selected?.parentId ?? parents[0]?.id ?? null,
  );
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (selected?.parentId) {
      setParentId(selected.parentId);
    }
  }, [selected?.parentId]);

  const children = useMemo(() => {
    return categories
      .filter((item) => item.parentId === parentId && item.active)
      .filter((item) => item.name.includes(query.trim()))
      .sort((left, right) => {
        const leftRecent = recentIds.indexOf(left.id);
        const rightRecent = recentIds.indexOf(right.id);
        const leftRank =
          leftRecent === -1 ? Number.MAX_SAFE_INTEGER : leftRecent;
        const rightRank =
          rightRecent === -1 ? Number.MAX_SAFE_INTEGER : rightRecent;
        return leftRank - rightRank || left.sortOrder - right.sortOrder;
      });
  }, [categories, parentId, query, recentIds]);

  return (
    <fieldset className="category-picker">
      <legend>分类</legend>
      <div className="category-columns">
        <div role="group" aria-label="一级分类" className="category-parents">
          {parents.map((parent) => (
            <button
              key={parent.id}
              type="button"
              aria-pressed={parent.id === parentId}
              onClick={() => setParentId(parent.id)}
            >
              {parent.name}
            </button>
          ))}
        </div>
        <div role="group" aria-label="二级分类" className="category-children">
          <input
            aria-label="搜索二级分类"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索小类"
          />
          <div className="category-options">
            {children.map((child) => (
              <button
                key={child.id}
                type="button"
                aria-pressed={child.id === value}
                onClick={() => onChange(child.id)}
              >
                {child.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </fieldset>
  );
}
