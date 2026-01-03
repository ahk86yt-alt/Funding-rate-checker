import HeaderNavClient from './HeaderNavClient';

export default function AppHeader() {
  return (
    <header
      style={{
        borderBottom: '1px solid #e5e7eb',
        background: '#fff',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900 }}>
          資金調達率チェッカー
        </div>

        {/* 右上ナビ（レート一覧 / アラート管理 / ログイン） */}
        <HeaderNavClient />
      </div>
    </header>
  );
}
