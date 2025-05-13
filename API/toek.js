export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Alleen POST-requests toegestaan' });
  }

  const prompt = req.body.prompt;
  if (!prompt) {
    return res.status(400).json({ error: 'Geen prompt ontvangen' });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const ASSISTANT_ID = process.env.ASSISTANT_ID;

  try {
    const threadRes = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const thread = await threadRes.json();

    const runRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({ assistant_id: ASSISTANT_ID })
    });
    const run = await runRes.json();

    let status = 'in_progress';
    while (status === 'in_progress' || status === 'queued') {
      await new Promise(r => setTimeout(r, 1000));
      const pollRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      const pollData = await pollRes.json();
      status = pollData.status;
    }

    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });
    const messages = await messagesRes.json();

    const lastMessage = messages.data?.[0]?.content?.[0]?.text?.value || '(Geen reactie)';
    res.status(200).json({ output: lastMessage });

  } catch (err) {
    console.error('Fout:', err);
    res.status(500).json({ error: 'Iets ging mis bij Toek :(' });
  }
}
