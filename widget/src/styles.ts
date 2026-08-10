export const WIDGET_STYLES = `
/* PrivacyTech Widget Styles */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

#pt-widget-root {
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #1e293b;
  position: fixed;
  z-index: 999999;
}

/* Floating Privacy Badge */
.pt-floating-badge {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid rgba(255, 255, 255, 0.1);
}
.pt-floating-badge:hover {
  transform: scale(1.1) rotate(15deg);
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.6);
}
.pt-floating-badge svg {
  width: 24px;
  height: 24px;
  fill: #ffffff;
}

/* Capa 1: Cookie Banner */
.pt-banner {
  position: fixed;
  bottom: 24px;
  left: 24px;
  right: 88px; /* Safe space for the floating badge */
  max-width: 800px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: ptSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
@media (min-width: 768px) {
  .pt-banner {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }
}
.pt-banner-content {
  flex: 1;
}
.pt-banner-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 6px 0;
  color: #0f172a;
}
.pt-banner-desc {
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
  color: #475569;
}
.pt-banner-desc a {
  color: #2563eb;
  text-decoration: underline;
  cursor: pointer;
  font-weight: 500;
}
.pt-banner-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  min-width: 280px;
}
.pt-btn {
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  outline: none;
}
.pt-btn-primary {
  background: #2563eb;
  color: white;
  flex: 1;
}
.pt-btn-primary:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}
.pt-btn-secondary {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #e2e8f0;
}
.pt-btn-secondary:hover {
  background: #e2e8f0;
}

/* Modales (Capa 2, ARCO+, Política) */
.pt-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: ptFadeIn 0.3s ease;
}
.pt-modal {
  background: #ffffff;
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  animation: ptScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.pt-modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pt-modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}
.pt-modal-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #94a3b8;
  line-height: 1;
  padding: 0;
}
.pt-modal-close:hover {
  color: #475569;
}
.pt-modal-body {
  padding: 24px;
  max-height: 70vh;
  overflow-y: auto;
}

/* Preference Cards (Capa 2) */
.pt-pref-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.pt-pref-card:focus-within {
  border-color: #2563eb;
}
.pt-pref-checkbox {
  margin-top: 4px;
  width: 16px;
  height: 16px;
  accent-color: #2563eb;
}
.pt-pref-info {
  flex: 1;
}
.pt-pref-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 4px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.pt-pref-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: #f1f5f9;
  border-radius: 99px;
  color: #64748b;
  font-weight: 500;
}
.pt-pref-desc {
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
  margin: 0;
}

/* Form Styles (ARCO+) */
.pt-form-group {
  margin-bottom: 16px;
}
.pt-form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
}
.pt-form-input, .pt-form-select, .pt-form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  box-sizing: border-box;
}
.pt-form-input:focus, .pt-form-select:focus, .pt-form-textarea:focus {
  border-color: #2563eb;
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}
.pt-form-alert {
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.4;
  margin-bottom: 16px;
}
.pt-form-alert-info {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e3a8a;
}
.pt-form-alert-success {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #14532d;
}

/* Policy Content Viewer styles */
.pt-policy-section {
  margin-bottom: 18px;
}
.pt-policy-sec-title {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 6px 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.pt-policy-sec-body {
  font-size: 13px;
  color: #475569;
  line-height: 1.5;
  margin: 0;
}

/* Animations */
@keyframes ptSlideUp {
  from { transform: translateY(100px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes ptFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes ptScaleUp {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
`;
