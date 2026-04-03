interface Props {
  hp: number;
  maxHp?: number;
  label: string;
  side: 'left' | 'right';
  color?: string;
}

export default function HealthBar({ hp, maxHp = 100, label, side, color }: Props) {
  const percentage = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const barColor = color || (percentage > 60 ? '#39d353' : percentage > 30 ? '#d29922' : '#f85149');

  return (
    <div className={`flex flex-col gap-1 ${side === 'right' ? 'items-end' : 'items-start'}`}>
      <span className="pixel-font text-[10px] text-dark-text">{label}</span>
      <div className="w-40 md:w-56 h-5 bg-dark-bg pixel-border relative overflow-hidden">
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: barColor,
            float: side === 'right' ? 'right' : 'left',
            boxShadow: `0 0 8px ${barColor}40`,
          }}
        />
        <span
          className="absolute inset-0 flex items-center justify-center pixel-font text-[8px] text-white"
          style={{ textShadow: '1px 1px 0 #000' }}
        >
          {hp} / {maxHp}
        </span>
      </div>
    </div>
  );
}
