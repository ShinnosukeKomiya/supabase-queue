import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')

interface QueueMessage {
  content: string
  timestamp: string
}

const queues = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'pgmq_public' },
})

const handler = async (_request: Request): Promise<Response> => {
  try {
    // キューからメッセージを読み取り
    const response = await queues.rpc('read', {
      n: 1,
      queue_name: 'message_queue',
      sleep_seconds: 30
    })

    // メッセージが存在しない場合は早期リターン
    if (!response.data || response.data.length === 0) {
      return new Response(JSON.stringify({ message: 'No messages in queue' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 最初のメッセージを処理
    const message = response.data[0]
    const messageContent = JSON.parse(message.message) as QueueMessage  // message.msg から message.message に変更
    const yourEmail = ''

    // Resend APIを呼び出してメール送信
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: yourEmail,
        subject: 'Message from Queue',
        html: `<strong>Message Content:</strong><br>${messageContent.content}<br>
              <strong>Timestamp:</strong><br>${messageContent.timestamp}`,
      }),
    })

    const resendData = await resendResponse.json()

    // メール送信が成功したらメッセージを削除
    if (resendResponse.ok) {
      await queues.rpc('delete', {
        queue_name: 'message_queue',
        message_id: message.msg_id
      })
    }

    return new Response(JSON.stringify({
      message: 'Email sent successfully',
      resendData,
      queueMessageId: message.msg_id
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

Deno.serve(handler)
