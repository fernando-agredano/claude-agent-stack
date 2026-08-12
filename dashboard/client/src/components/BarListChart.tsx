type BarListItem = {
  label: string;
  value: number;
  displayValue: string;
};

export function BarListChart({ items, color = "var(--accent)" }: { items: BarListItem[]; color?: string }) {
  if (items.length === 0) {
    return <p className="empty-hint">Sin datos suficientes todavia.</p>;
  }

  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="barlist">
      {items.map((item) => (
        <div key={item.label} className="barlist__row">
          <span className="barlist__label">{item.label}</span>
          <div className="barlist__track">
            <div className="barlist__fill" style={{ width: `${(item.value / max) * 100}%`, background: color }} />
          </div>
          <span className="barlist__value">{item.displayValue}</span>
        </div>
      ))}
    </div>
  );
}
