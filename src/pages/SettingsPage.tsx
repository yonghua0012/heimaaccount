import { CategoryManager } from "../features/categories/CategoryManager";
import type { Category } from "../types/domain";

interface SettingsPageProps {
  categories: Category[];
  revision: number;
  onCategoriesChanged: () => void;
}

export function SettingsPage({
  categories,
  onCategoriesChanged,
}: SettingsPageProps) {
  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">个性化与数据</p>
          <h1>设置</h1>
        </div>
      </header>
      <CategoryManager categories={categories} onChanged={onCategoriesChanged} />
    </div>
  );
}
