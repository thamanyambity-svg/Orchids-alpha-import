export async function sendToN8N(event: string, data: any) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn(`N8N_WEBHOOK_URL is not defined. Skipping webhook for event: ${event}`);
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        data,
      }),
    });

    if (!response.ok) {
      throw new Error(`n8n webhook failed with status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error sending to n8n for event ${event}:`, error);
  }
}
