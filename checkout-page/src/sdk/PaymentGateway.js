/**
 * PaymentGateway SDK
 * Embeddable payment widget for accepting payments
 */

class PaymentGateway {
  constructor(options = {}) {
    // Validate required options
    if (!options.key) {
      throw new Error('API key is required');
    }

    // Validate callback functions
    if (options.onSuccess && typeof options.onSuccess !== 'function') {
      throw new Error('onSuccess must be a function');
    }
    if (options.onFailure && typeof options.onFailure !== 'function') {
      throw new Error('onFailure must be a function');
    }
    if (options.onClose && typeof options.onClose !== 'function') {
      throw new Error('onClose must be a function');
    }

    this.options = {
      key: options.key,
      orderId: options.orderId,
      onSuccess: options.onSuccess || (() => {}),
      onFailure: options.onFailure || (() => {}),
      onClose: options.onClose || (() => {}),
      apiBase: options.apiBase || 'http://localhost:3001'
    };

    this.modal = null;
    this.iframe = null;
  }

  open() {
    // Root wrapper (required structure for automated tests)
    const root = document.createElement('div');
    root.id = 'payment-gateway-modal';
    root.setAttribute('data-test-id', 'payment-modal');

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      padding: 16px;
      box-sizing: border-box;
    `;

    // Create modal content wrapper
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = `
      position: relative;
      width: 90%;
      max-width: 600px;
      height: 90vh;
      max-height: 700px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    `;

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.setAttribute('data-test-id', 'close-modal-button');
    closeButton.className = 'close-button';
    closeButton.textContent = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      width: 40px;
      height: 40px;
      border: none;
      background: #f0f0f0;
      color: #333;
      font-size: 28px;
      cursor: pointer;
      border-radius: 4px;
      z-index: 10001;
      transition: all 0.2s;
    `;

    closeButton.addEventListener('mouseover', () => {
      closeButton.style.background = '#e0e0e0';
    });
    closeButton.addEventListener('mouseout', () => {
      closeButton.style.background = '#f0f0f0';
    });
    closeButton.addEventListener('click', () => this.close());

    // Create iframe
    this.iframe = document.createElement('iframe');
    this.iframe.setAttribute('data-test-id', 'payment-iframe');
    this.iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
    `;

    // Build checkout URL
    const params = new URLSearchParams({
      order_id: this.options.orderId,
      embedded: 'true',
      key: this.options.key
    });

    this.iframe.src = `${this.options.apiBase}/checkout?${params.toString()}`;

    // Append elements
    modalContent.appendChild(this.iframe);
    modalContent.appendChild(closeButton);
    overlay.appendChild(modalContent);
    root.appendChild(overlay);
    document.body.appendChild(root);

    this.modal = root;

    // Set up postMessage listener
    this.setupMessageListener();

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  setupMessageListener() {
    this.messageHandler = (event) => {
      // For development, accept all origins
      // In production, validate event.origin

      if (!event.data || typeof event.data !== 'object') return;

      const { type, data } = event.data;

      switch (type) {
        case 'payment_success':
          this.options.onSuccess(data);
          this.close();
          break;

        case 'payment_failed':
          this.options.onFailure(data);
          break;

        case 'close_modal':
          this.close();
          break;
      }
    };

    window.addEventListener('message', this.messageHandler);
  }

  close() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
      this.iframe = null;
    }

    // Restore body scroll
    document.body.style.overflow = 'auto';

    // Remove message listener
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
    }

    this.options.onClose();
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.PaymentGateway = PaymentGateway;
}

export default PaymentGateway;
