import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
};

export const createPgmqClient = async () => {
  const supabase = await createClient();

  return {
    send: async (queue: string, message: any) => {
      const { data, error } = await supabase.rpc('pgmq_send', {
        p_queue: queue,
        p_msg: message,
      });

      if (error) throw error;
      return data;
    },

    read: async (queue: string, vt: number = 30) => {
      const { data, error } = await supabase.rpc('pgmq_read', {
        p_queue: queue,
        p_vt: vt
      });

      if (error) throw error;
      return data;
    },

    delete: async (queue: string, message_id: string) => {
      const { data, error } = await supabase.rpc('pgmq_delete', {
        p_queue: queue,
        p_msg_id: message_id
      });

      if (error) throw error;
      return data;
    }
  };
};
