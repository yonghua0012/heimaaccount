import type { Category, ExpenseFilter } from "../../types/domain";

interface ExpenseFiltersProps {
  categories: Category[];
  filter: ExpenseFilter;
  onChange: (filter: ExpenseFilter) => void;
}

export function ExpenseFilters({
  categories,
  filter,
  onChange,
}: ExpenseFiltersProps) {
  const parents = categories.filter((item) => item.parentId === null);
  const children = categories.filter(
    (item) =>
      item.parentId !== null && item.parentId === filter.parentCategoryId,
  );

  return (
    <section className="filters" aria-label="支出筛选">
      <label>
        <span>月份</span>
        <input
          type="month"
          value={filter.month}
          onChange={(event) =>
            onChange({ ...filter, month: event.target.value })
          }
        />
      </label>
      <label>
        <span>一级分类</span>
        <select
          value={filter.parentCategoryId ?? ""}
          onChange={(event) =>
            onChange({
              ...filter,
              parentCategoryId: event.target.value || null,
              categoryId: null,
            })
          }
        >
          <option value="">全部</option>
          {parents.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>二级分类</span>
        <select
          value={filter.categoryId ?? ""}
          disabled={!filter.parentCategoryId}
          onChange={(event) =>
            onChange({ ...filter, categoryId: event.target.value || null })
          }
        >
          <option value="">全部</option>
          {children.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>搜索备注</span>
        <input
          value={filter.keyword ?? ""}
          placeholder="输入关键词"
          onChange={(event) =>
            onChange({ ...filter, keyword: event.target.value })
          }
        />
      </label>
    </section>
  );
}
