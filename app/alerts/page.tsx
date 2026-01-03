import AlertsClient from './AlertsClient';

export const dynamic = 'force-dynamic';

export default function AlertsPage() {
  return (
    <main style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>
        アラート管理
      </h1>
      <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
        登録済みアラートの一覧・検索・一括操作ができます。
      </div>

      <AlertsClient />
    </main>
  );
}
