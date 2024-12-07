"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient, createPgmqClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  } else {
    return encodedRedirect(
      "success",
      "/sign-up",
      "Thanks for signing up! Please check your email for a verification link.",
    );
  }
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect("/protected");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password update failed",
    );
  }

  encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};

export async function enqueueMessage(formData: FormData) {
  try {
    const pgmqClient = await createPgmqClient();
    const message = formData.get('message')?.toString() || '';

    // JSON形式のメッセージを作成
    const messageObject = {
      content: message,
      timestamp: new Date().toISOString()
    };

    const result = await pgmqClient.send('message_queue', JSON.stringify(messageObject));

    return { success: true, messageId: result };
  } catch (error) {
    console.error('Error enqueueing message:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

export async function readMessage() {
  try {
    const pgmqClient = await createPgmqClient();
    const messages = await pgmqClient.read('message_queue');
    return {
      success: true,
      messages: messages.map(msg => ({
        id: msg.msg_id,
        content: msg.msg,
        readCount: msg.read_ct,
        enqueuedAt: msg.enqueued_at,
        lastReadAt: msg.last_read_at
      }))
    };
  } catch (error) {
    console.error('Error reading message:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

export async function deleteMessage(messageId: string) {
  try {
    const pgmqClient = await createPgmqClient();
    await pgmqClient.delete('message_queue', messageId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting message:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}
