import { open, save } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { CategoryManager } from "../features/categories/CategoryManager";
import { api, getErrorMessage, type AppInfo } from "../lib/api";
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
  const [message, setMessage] = useState("");
  const [pendingRestore, setPendingRestore] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    api
      .getAppInfo()
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  async function run(action: () => Promise<string>) {
    try {
      setMessage(await action());
    } catch (cause) {
      setMessage(getErrorMessage(cause, "操作失败"));
    }
  }

  async function backupNow() {
    const destination = await save({
      title: "保存黑马记账备份",
      defaultPath: "黑马记账备份.db",
      filters: [{ name: "SQLite 数据库", extensions: ["db"] }],
    });
    if (destination) {
      await run(async () => (await api.createBackup(destination)).message);
    }
  }

  async function chooseRestore() {
    const source = await open({
      title: "选择黑马记账备份",
      multiple: false,
      filters: [{ name: "SQLite 数据库", extensions: ["db"] }],
    });
    if (typeof source === "string") {
      setPendingRestore(source);
    }
  }

  async function confirmRestore() {
    if (!pendingRestore) return;
    setRestoring(true);
    try {
      const result = await api.restoreBackup(pendingRestore);
      setMessage(`${result.message}。应用即将重新加载。`);
      setPendingRestore(null);
      window.location.reload();
    } catch (cause) {
      setPendingRestore(null);
      setMessage(getErrorMessage(cause, "恢复失败"));
    } finally {
      setRestoring(false);
    }
  }

  async function exportNow() {
    const destination = await save({
      title: "导出支出明细",
      defaultPath: "黑马记账支出.csv",
      filters: [{ name: "CSV 表格", extensions: ["csv"] }],
    });
    if (destination) {
      await run(async () => (await api.exportCsv(destination)).message);
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">个性化与数据</p>
          <h1>设置</h1>
        </div>
      </header>
      {message && <p role="status">{message}</p>}
      <CategoryManager categories={categories} onChanged={onCategoriesChanged} />
      <section className="panel data-settings">
        <header className="section-header">
          <h2>数据管理</h2>
          <span>所有文件均保存在本机</span>
        </header>
        <div className="data-actions">
          <button
            type="button"
            className="data-action"
            aria-label="立即备份"
            onClick={() => void backupNow()}
          >
            <strong>立即备份</strong>
            <span>把完整数据库保存到你选择的位置</span>
          </button>
          <button
            type="button"
            className="data-action"
            aria-label="从备份恢复"
            onClick={() => void chooseRestore()}
          >
            <strong>从备份恢复</strong>
            <span>校验备份后替换当前数据</span>
          </button>
          <button
            type="button"
            className="data-action"
            aria-label="导出 CSV"
            onClick={() => void exportNow()}
          >
            <strong>导出 CSV</strong>
            <span>导出全部记录用于表格查看</span>
          </button>
          <button
            type="button"
            className="data-action"
            aria-label="打开数据目录"
            onClick={() =>
              void run(async () => {
                const path = await api.openDataDir();
                await openPath(path);
                return "已打开数据目录";
              })
            }
          >
            <strong>打开数据目录</strong>
            <span>查看数据库和自动备份文件</span>
          </button>
        </div>
      </section>
      <section className="panel about-panel">
        <header className="section-header">
          <h2>关于</h2>
          <span>本地优先 · 离线可用</span>
        </header>
        <p>黑马记账 {info?.version ?? "版本读取中"}</p>
        <p>数据保存在本机，应用首版不上传财务记录。</p>
        {info && <p className="data-path">数据目录：{info.dataDir}</p>}
      </section>
      {pendingRestore && (
        <ConfirmDialog
          title="确认恢复这个备份？"
          detail={`备份文件：${pendingRestore}\n当前数据库会先自动备份，再用所选备份替换。`}
          confirmLabel="确认恢复"
          busy={restoring}
          onCancel={() => setPendingRestore(null)}
          onConfirm={() => void confirmRestore()}
        />
      )}
    </div>
  );
}
