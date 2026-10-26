import { useState } from "react";
import { api, getErrorMessage } from "../../lib/api";
import type { Category } from "../../types/domain";
import { ConfirmDialog } from "../../components/ConfirmDialog";

interface CategoryManagerProps {
  categories: Category[];
  onChanged: () => void;
}

export function CategoryManager({
  categories,
  onChanged,
}: CategoryManagerProps) {
  const parents = categories.filter((item) => item.parentId === null);
  const [parentId, setParentId] = useState("");
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({});
  const [pendingDeactivate, setPendingDeactivate] =
    useState<Category | null>(null);
  const [error, setError] = useState("");
  const children = categories.filter((item) => item.parentId === parentId);

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      setError("");
      setNewName("");
      setRenamingId(null);
      onChanged();
    } catch (cause) {
      setError(getErrorMessage(cause, "分类操作失败"));
    }
  }

  function requestToggle(category: Category) {
    if (category.active) {
      setPendingDeactivate(category);
      return;
    }
    void run(() => api.setCategoryActive(category.id, true));
  }

  return (
    <section className="category-manager panel">
      <header className="section-header">
        <h2>分类管理</h2>
        <span>最多两级，历史记录始终保留</span>
      </header>
      <div className="category-create">
        <label>
          <span>所属大类</span>
          <select
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
          >
            <option value="">新建一级分类</option>
            {parents.map((parent) => (
              <option
                key={parent.id}
                value={parent.id}
                disabled={!parent.active}
              >
                {parent.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>分类名称</span>
          <input
            value={newName}
            maxLength={20}
            onChange={(event) => setNewName(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="primary"
          disabled={!newName.trim()}
          onClick={() =>
            void run(() => api.createCategory(parentId || null, newName))
          }
        >
          新增分类
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="category-columns category-settings">
        <div className="parent-list">
          {parents.map((parent) => (
            <div key={parent.id} className="category-row">
              {renamingId === parent.id ? (
                <>
                  <input
                    aria-label={`重命名 ${parent.name}`}
                    value={renameValue}
                    maxLength={20}
                    onChange={(event) => setRenameValue(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      void run(() =>
                        api.renameCategory(parent.id, renameValue),
                      )
                    }
                  >
                    保存名称
                  </button>
                  <button type="button" onClick={() => setRenamingId(null)}>
                    取消
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={parent.id === parentId ? "selected" : ""}
                    aria-pressed={parent.id === parentId}
                    onClick={() => setParentId(parent.id)}
                  >
                    {parent.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`重命名 ${parent.name}`}
                    onClick={() => {
                      setRenamingId(parent.id);
                      setRenameValue(parent.name);
                    }}
                  >
                    重命名
                  </button>
                  <button
                    type="button"
                    aria-label={`${parent.active ? "停用" : "启用"} ${parent.name}`}
                    onClick={() => requestToggle(parent)}
                  >
                    {parent.active ? "停用" : "启用"}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <ul className="category-admin-list">
          {parentId === "" && (
            <li className="empty-state">选择左侧大类以管理二级分类。</li>
          )}
          {children.map((child) => (
            <li key={child.id}>
              {renamingId === child.id ? (
                <>
                  <input
                    aria-label={`重命名 ${child.name}`}
                    value={renameValue}
                    maxLength={20}
                    onChange={(event) => setRenameValue(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      void run(() => api.renameCategory(child.id, renameValue))
                    }
                  >
                    保存名称
                  </button>
                  <button type="button" onClick={() => setRenamingId(null)}>
                    取消
                  </button>
                </>
              ) : (
                <>
                  <span className={!child.active ? "inactive" : ""}>
                    {child.name}
                    {!child.active && "（已停用）"}
                  </span>
                  <button
                    type="button"
                    aria-label={`重命名 ${child.name}`}
                    onClick={() => {
                      setRenamingId(child.id);
                      setRenameValue(child.name);
                    }}
                  >
                    重命名
                  </button>
                  <button
                    type="button"
                    onClick={() => requestToggle(child)}
                  >
                    {child.active ? "停用" : "启用"}
                  </button>
                  <label>
                    <span>移至其他大类</span>
                    <select
                      aria-label={`移动 ${child.name}`}
                      value={moveTargets[child.id] ?? ""}
                      onChange={(event) =>
                        setMoveTargets((current) => ({
                          ...current,
                          [child.id]: event.target.value,
                        }))
                      }
                    >
                      <option value="">请选择</option>
                      {parents
                        .filter((parent) => parent.active)
                        .map((parent) => (
                          <option key={parent.id} value={parent.id}>
                            {parent.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    aria-label={`确认移动 ${child.name}`}
                    disabled={
                      !moveTargets[child.id] ||
                      moveTargets[child.id] === child.parentId
                    }
                    onClick={() =>
                      void run(() =>
                        api.moveCategory(child.id, moveTargets[child.id]),
                      )
                    }
                  >
                    移动
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
      {pendingDeactivate && (
        <ConfirmDialog
          title="确认停用分类？"
          detail={`停用“${pendingDeactivate.name}”后，已有记录仍会保留，但新支出不能再选择该分类。`}
          confirmLabel="确认停用"
          onCancel={() => setPendingDeactivate(null)}
          onConfirm={() => {
            const category = pendingDeactivate;
            setPendingDeactivate(null);
            void run(() => api.setCategoryActive(category.id, false));
          }}
        />
      )}
    </section>
  );
}
