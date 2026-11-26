export function SomedayStats({ stats }) {
  return (
    <div
      className="someday-stats"
      aria-label="Someday summary statistics"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        margin: '16px 0'
      }}
    >
      {/* 1. Total Items: Primary Blue fill with white text */}
      <div
        style={{
          backgroundColor: '#3A4EFB',
          color: '#FFFFFF',
          border: '2px solid #252943',
          borderRadius: '10px',
          boxShadow: '3px 3px 0 #252943',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Total Items
        </span>
        <span style={{ fontSize: '26px', fontWeight: 800, lineHeight: 1 }}>
          {stats.total}
        </span>
      </div>

      {/* 2. Planned: Secondary Blue fill with Deep Navy text */}
      <div
        style={{
          backgroundColor: '#33A4FA',
          color: '#252943',
          border: '2px solid #252943',
          borderRadius: '10px',
          boxShadow: '3px 3px 0 #252943',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Planned
        </span>
        <span style={{ fontSize: '26px', fontWeight: 800, lineHeight: 1 }}>
          {stats.planned}
        </span>
      </div>

      {/* 3. Purchased: Fresh Green fill with white text */}
      <div
        style={{
          backgroundColor: '#168B68',
          color: '#FFFFFF',
          border: '2px solid #252943',
          borderRadius: '10px',
          boxShadow: '3px 3px 0 #252943',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Purchased
        </span>
        <span style={{ fontSize: '26px', fontWeight: 800, lineHeight: 1 }}>
          {stats.purchased}
        </span>
      </div>
    </div>
  );
}
