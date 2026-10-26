const navigation = ["总览", "支出明细", "分类统计", "设置"] as const;

export default function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">黑马记账</div>
        <nav aria-label="主导航">
          {navigation.map((label) => (
            <button key={label} type="button">
              {label}
            </button>
          ))}
        </nav>
      </aside>
      <section className="content">
        <h1>总览</h1>
      </section>
    </main>
  );
}
