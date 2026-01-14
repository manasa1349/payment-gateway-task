import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:8000/api/v1';

export default function Webhooks() {
  const navigate = useNavigate();
  const [merchant, setMerchant] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  // Check auth
  useEffect(() => {
    const auth = localStorage.getItem('auth');
    if (!auth) {
      navigate('/login');
      return;
    }
    const merchant = JSON.parse(auth);
    setMerchant(merchant);
    setWebhookUrl(merchant.webhook_url || '');
    setWebhookSecret(merchant.webhook_secret || '');
  }, [navigate]);

  // Fetch webhook logs
  const fetchLogs = async (l = limit, o = offset) => {
    if (!merchant) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/webhooks?limit=${l}&offset=${o}`, {
        headers: {
          'X-Api-Key': merchant.api_key,
          'X-Api-Secret': merchant.api_secret
        }
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error.description);
      } else {
        setLogs(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      setError('Failed to fetch webhook logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (merchant) {
      fetchLogs();
    }
  }, [merchant]);

  const handleSaveWebhookConfig = async (e) => {
    e.preventDefault();
    if (!merchant) return;

    setSaveLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE}/webhooks/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': merchant.api_key,
          'X-Api-Secret': merchant.api_secret
        },
        body: JSON.stringify({ webhook_url: webhookUrl || null })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        setError(data?.error?.description || 'Failed to save webhook configuration');
      } else {
        const updated = { ...merchant, webhook_url: data.webhook_url, webhook_secret: data.webhook_secret };
        localStorage.setItem('auth', JSON.stringify(updated));
        setMerchant(updated);
        setWebhookUrl(data.webhook_url || '');
        setWebhookSecret(data.webhook_secret || '');
        setSuccess('Webhook configuration saved!');
      }
    } catch (err) {
      setError('Failed to save webhook configuration');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleRegenerateSecret = async () => {
    if (!merchant) return;
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${API_BASE}/webhooks/regenerate-secret`, {
        method: 'POST',
        headers: {
          'X-Api-Key': merchant.api_key,
          'X-Api-Secret': merchant.api_secret
        }
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        setError(data?.error?.description || 'Failed to regenerate secret');
      } else {
        const updated = { ...merchant, webhook_secret: data.webhook_secret };
        localStorage.setItem('auth', JSON.stringify(updated));
        setMerchant(updated);
        setWebhookSecret(data.webhook_secret);
        setSuccess('Secret regenerated!');
      }
    } catch (err) {
      setError('Failed to regenerate secret');
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl) {
      setError('Please configure a webhook URL first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE}/webhooks/test`, {
        method: 'POST',
        headers: {
          'X-Api-Key': merchant.api_key,
          'X-Api-Secret': merchant.api_secret
        }
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        setError(data?.error?.description || 'Failed to send test webhook');
      } else if (data.skipped) {
        setError(data.message || 'Webhook URL not configured');
      } else {
        setSuccess('Test webhook scheduled (will appear in logs)');
        fetchLogs();
      }
    } catch (err) {
      setError('Failed to send test webhook');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryWebhook = async (webhookId) => {
    if (!merchant) return;

    try {
      const response = await fetch(`${API_BASE}/webhooks/${webhookId}/retry`, {
        method: 'POST',
        headers: {
          'X-Api-Key': merchant.api_key,
          'X-Api-Secret': merchant.api_secret
        }
      });

      if (response.ok) {
        setSuccess('Webhook retry scheduled');
        fetchLogs();
      } else {
        setError('Failed to retry webhook');
      }
    } catch (err) {
      setError('Failed to retry webhook');
    }
  };

  if (!merchant) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={styles.container} data-test-id="webhook-config">
      <h2 style={styles.title}>Webhook Configuration</h2>

      {error && <div style={{ ...styles.alert, background: '#fee', color: '#c33' }}>{error}</div>}
      {success && <div style={{ ...styles.alert, background: '#efe', color: '#3c3' }}>{success}</div>}

      <form onSubmit={handleSaveWebhookConfig} data-test-id="webhook-config-form" style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Webhook URL</label>
          <input
            type="url"
            data-test-id="webhook-url-input"
            placeholder="https://yoursite.com/webhook"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Webhook Secret</label>
          <div style={styles.secretGroup}>
            <span data-test-id="webhook-secret" style={styles.secretValue}>
              {webhookSecret || 'No secret generated'}
            </span>
            <button
              type="button"
              data-test-id="regenerate-secret-button"
              onClick={handleRegenerateSecret}
              style={styles.secondaryButton}
            >
              Regenerate
            </button>
          </div>
        </div>

        <div style={styles.buttonGroup}>
          <button
            type="submit"
            data-test-id="save-webhook-button"
            disabled={saveLoading}
            style={styles.primaryButton}
          >
            {saveLoading ? 'Saving...' : 'Save Configuration'}
          </button>

          <button
            type="button"
            data-test-id="test-webhook-button"
            onClick={handleTestWebhook}
            style={styles.secondaryButton}
          >
            Send Test Webhook
          </button>
        </div>
      </form>

      <h3 style={styles.subtitle}>Webhook Logs</h3>

      <div style={styles.tableWrapper}>
        <table style={styles.table} data-test-id="webhook-logs-table">
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.tableCell}>Event</th>
              <th style={styles.tableCell}>Status</th>
              <th style={styles.tableCell}>Attempts</th>
              <th style={styles.tableCell}>Last Attempt</th>
              <th style={styles.tableCell}>Response Code</th>
              <th style={styles.tableCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ ...styles.tableCell, textAlign: 'center', color: '#999' }}>
                  No webhook logs yet
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} style={styles.tableRow} data-test-id="webhook-log-item" data-webhook-id={log.id}>
                  <td style={styles.tableCell} data-test-id="webhook-event">{log.event}</td>
                  <td style={styles.tableCell} data-test-id="webhook-status">
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: log.status === 'success' ? '#efe' : log.status === 'failed' ? '#fee' : '#ffe',
                      color: log.status === 'success' ? '#3c3' : log.status === 'failed' ? '#c33' : '#aa6'
                    }}>
                      {log.status}
                    </span>
                  </td>
                  <td style={styles.tableCell} data-test-id="webhook-attempts">{log.attempts}</td>
                  <td style={styles.tableCell} data-test-id="webhook-last-attempt">
                    {log.last_attempt_at ? new Date(log.last_attempt_at).toLocaleString() : '-'}
                  </td>
                  <td style={styles.tableCell} data-test-id="webhook-response-code">
                    {log.response_code || '-'}
                  </td>
                  <td style={styles.tableCell}>
                    <button
                      data-test-id="retry-webhook-button"
                      data-webhook-id={log.id}
                      onClick={() => handleRetryWebhook(log.id)}
                      style={styles.retryButton}
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > limit && (
        <div style={styles.pagination}>
          <button
            disabled={offset === 0}
            onClick={() => {
              setOffset(Math.max(0, offset - limit));
              fetchLogs(limit, Math.max(0, offset - limit));
            }}
            style={styles.pageButton}
          >
            Previous
          </button>
          <span style={styles.pageInfo}>
            Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit)}
          </span>
          <button
            disabled={offset + limit >= total}
            onClick={() => {
              setOffset(offset + limit);
              fetchLogs(limit, offset + limit);
            }}
            style={styles.pageButton}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '30px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  title: {
    fontSize: '28px',
    marginBottom: '30px',
    color: '#1a1a1a'
  },
  alert: {
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '14px'
  },
  form: {
    background: '#f9f9f9',
    padding: '25px',
    borderRadius: '8px',
    marginBottom: '40px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#333'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  secretGroup: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  secretValue: {
    flex: 1,
    padding: '10px',
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontFamily: 'monospace',
    fontSize: '12px',
    wordBreak: 'break-all'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px'
  },
  primaryButton: {
    padding: '10px 20px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  secondaryButton: {
    padding: '10px 20px',
    background: '#e0e0e0',
    color: '#333',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap'
  },
  subtitle: {
    fontSize: '20px',
    marginBottom: '20px',
    color: '#1a1a1a'
  },
  tableWrapper: {
    overflowX: 'auto',
    marginBottom: '20px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: 'white'
  },
  tableHeader: {
    background: '#f5f5f5',
    borderBottom: '2px solid #ddd'
  },
  tableRow: {
    borderBottom: '1px solid #eee'
  },
  tableCell: {
    padding: '12px',
    textAlign: 'left',
    fontSize: '14px'
  },
  retryButton: {
    padding: '6px 12px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '15px',
    marginTop: '20px'
  },
  pageButton: {
    padding: '8px 15px',
    background: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  pageInfo: {
    fontSize: '14px',
    color: '#666'
  }
};
