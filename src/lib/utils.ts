import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to check if user has exceeded their limits
export const checkUserLimits = async (supabase: any, userId: string) => {
  try {
    // Get user's current limits from profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("monthly_minutes, monthly_messages")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return { voiceExceeded: false, chatExceeded: false };
    }

    const monthlyMinutes = profile?.monthly_minutes || 0;
    const monthlyMessages = profile?.monthly_messages || 0;

    // Get user's integrations to check if features are enabled
    const { data: integrations, error: integrationsError } = await supabase
      .from("integrations")
      .select("voice_enabled, chatbot_enabled, vapi_agent_id, chatbase_bot_id")
      .eq("id", userId)
      .single();

    if (integrationsError) {
      console.error("Error fetching integrations:", integrationsError);
      return { voiceExceeded: false, chatExceeded: false };
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);

    let voiceMinutesUsed = 0;
    let chatMessagesUsed = 0;

    // Calculate voice minutes used this month
    if (integrations?.vapi_agent_id) {
      const { data: vapiCalls } = await supabase
        .from("vapi_calls")
        .select("started_at, ended_at")
        .eq("assistant_id", integrations.vapi_agent_id)
        .gte("started_at", startOfMonth.toISOString());

      if (vapiCalls) {
        voiceMinutesUsed = vapiCalls.reduce((sum, call) => {
          if (!call.started_at || !call.ended_at) return sum;
          const start = new Date(call.started_at);
          const end = new Date(call.ended_at);
          if (isNaN(start.getTime()) || isNaN(end.getTime())) return sum;
          const durationInMinutes = (end.getTime() - start.getTime()) / 1000 / 60;
          return sum + durationInMinutes;
        }, 0);
      }
    }

    // Calculate chat messages used this month
    if (integrations?.chatbase_bot_id) {
      const { data: conversations } = await supabase
        .from("chatbase_conversations")
        .select("total_msgs, date")
        .eq("chatbot_id", integrations.chatbase_bot_id)
        .gte("date", startOfMonth.toISOString().split('T')[0]);

      if (conversations) {
        chatMessagesUsed = conversations.reduce((sum, conv) => sum + (conv.total_msgs || 0), 0);
      }
    }

    const voiceExceeded = integrations?.voice_enabled && voiceMinutesUsed >= monthlyMinutes;
    const chatExceeded = integrations?.chatbot_enabled && chatMessagesUsed >= monthlyMessages;

    // Auto-disable features if limits are exceeded
    if (voiceExceeded || chatExceeded) {
      const updates: any = {};
      
      if (voiceExceeded) {
        updates.voice_enabled = false;
      }
      
      if (chatExceeded) {
        updates.chatbot_enabled = false;
      }

      const { error: updateError } = await supabase
        .from("integrations")
        .update(updates)
        .eq("id", userId);

      if (updateError) {
        console.error("Error updating integrations:", updateError);
      }
    }

    return {
      voiceExceeded,
      chatExceeded,
      voiceMinutesUsed: Math.round(voiceMinutesUsed * 100) / 100,
      chatMessagesUsed,
      monthlyMinutes,
      monthlyMessages
    };
  } catch (error) {
    console.error("Error checking user limits:", error);
    return { voiceExceeded: false, chatExceeded: false };
  }
};

// Function to get user's current usage
export const getUserUsage = async (supabase: any, userId: string) => {
  try {
    const { data: integrations } = await supabase
      .from("integrations")
      .select("vapi_agent_id, chatbase_bot_id")
      .eq("id", userId)
      .single();

    const startOfMonth = new Date();
    startOfMonth.setDate(1);

    let voiceMinutesUsed = 0;
    let chatMessagesUsed = 0;

    // Calculate voice minutes used this month
    if (integrations?.vapi_agent_id) {
      const { data: vapiCalls } = await supabase
        .from("vapi_calls")
        .select("started_at, ended_at")
        .eq("assistant_id", integrations.vapi_agent_id)
        .gte("started_at", startOfMonth.toISOString());

      if (vapiCalls) {
        voiceMinutesUsed = vapiCalls.reduce((sum, call) => {
          if (!call.started_at || !call.ended_at) return sum;
          const start = new Date(call.started_at);
          const end = new Date(call.ended_at);
          if (isNaN(start.getTime()) || isNaN(end.getTime())) return sum;
          const durationInMinutes = (end.getTime() - start.getTime()) / 1000 / 60;
          return sum + durationInMinutes;
        }, 0);
      }
    }

    // Calculate chat messages used this month
    if (integrations?.chatbase_bot_id) {
      const { data: conversations } = await supabase
        .from("chatbase_conversations")
        .select("total_msgs, date")
        .eq("chatbot_id", integrations.chatbase_bot_id)
        .gte("date", startOfMonth.toISOString().split('T')[0]);

      if (conversations) {
        chatMessagesUsed = conversations.reduce((sum, conv) => sum + (conv.total_msgs || 0), 0);
      }
    }

    return {
      voiceMinutesUsed: Math.round(voiceMinutesUsed * 100) / 100,
      chatMessagesUsed
    };
  } catch (error) {
    console.error("Error getting user usage:", error);
    return { voiceMinutesUsed: 0, chatMessagesUsed: 0 };
  }
};
