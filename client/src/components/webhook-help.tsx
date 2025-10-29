export const WebhookHelp = () => {
  return (
    <div className="space-y-4 rounded-lg border border-primary-200 bg-primary-50 p-4 text-sm">
      <h3 className="font-semibold text-primary-700">How to Use Webhooks</h3>

      <div className="space-y-3">
        <div>
          <h4 className="mb-1 font-medium text-primary-600">1. Webhook URL</h4>
          <p className="text-primary-500">
            Copy the webhook URL below and use it in your external service or application.
          </p>
        </div>

        <div>
          <h4 className="mb-1 font-medium text-primary-600">2. Signature Validation (Recommended)</h4>
          <p className="text-primary-500">
            When enabled, incoming webhooks must include an{' '}
            <code className="rounded bg-primary-100 px-1 text-xs">X-Webhook-Signature</code> header
            with a valid HMAC-SHA256 signature.
          </p>
        </div>

        <div>
          <h4 className="mb-1 font-medium text-primary-600">3. Generate Signature</h4>
          <p className="text-primary-500">Calculate the signature using HMAC-SHA256:</p>
          <div className="mt-2 rounded bg-primary-100 p-2 font-mono text-xs text-primary-700">
            <div>Python:</div>
            <code className="block">
              import hmac, hashlib
              <br />
              signature = hmac.new(
              <br />
              &nbsp;&nbsp;secret.encode(),
              <br />
              &nbsp;&nbsp;request_body,
              <br />
              &nbsp;&nbsp;hashlib.sha256
              <br />
              ).hexdigest()
            </code>
            <div className="mt-3">JavaScript:</div>
            <code className="block">
              const crypto = require(&apos;crypto&apos;);
              <br />
              const signature = crypto
              <br />
              &nbsp;&nbsp;.createHmac(&apos;sha256&apos;, secret)
              <br />
              &nbsp;&nbsp;.update(requestBody)
              <br />
              &nbsp;&nbsp;.digest(&apos;hex&apos;);
            </code>
          </div>
        </div>

        <div>
          <h4 className="mb-1 font-medium text-primary-600">4. Send Request</h4>
          <p className="text-primary-500">Send a POST request with JSON payload:</p>
          <div className="mt-2 rounded bg-primary-100 p-2 font-mono text-xs text-primary-700">
            <code>
              POST /api/webhooks/tasks/&#123;task-id&#125;/
              <br />
              Content-Type: application/json
              <br />
              X-Webhook-Signature: &#123;signature&#125;
              <br />
              <br />
              &#123;&quot;data&quot;: &quot;your payload&quot;&#125;
            </code>
          </div>
        </div>

        <div className="rounded border border-accent/20 bg-accent/5 p-3">
          <h4 className="mb-1 flex items-center gap-2 font-medium text-accent-700">
            <span>⚠️</span>
            <span>Security Note</span>
          </h4>
          <p className="text-xs text-accent-600">
            Keep your webhook secret safe! Anyone with the secret can trigger your task. If you
            suspect your secret has been compromised, disable signature validation temporarily and
            contact support.
          </p>
        </div>
      </div>
    </div>
  )
}
