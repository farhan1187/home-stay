import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase environment variables on server." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Verify caller authorization token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerClient = createClient(supabaseUrl, anonKey || serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired session." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check if caller is super_admin in profiles table
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerProfile, error: profileErr } = await adminClient
      .from("profiles")
      .select("role, active")
      .eq("id", callerUser.id)
      .single();

    if (profileErr || !callerProfile || callerProfile.role !== "super_admin" || !callerProfile.active) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Only active super_admin can perform this action." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Parse action and payload
    const body = await req.json();
    const { action } = body;

    // Action: create_user
    if (action === "create_user") {
      const { email, password, full_name, role = "manager", assigned_homestays = [] } = body;

      if (!email || !password || !full_name) {
        return new Response(
          JSON.stringify({ error: "Email, password, and full name are required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create user using Supabase Auth Admin API
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role },
      });

      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const createdUserId = newUser.user.id;

      // Upsert profile record
      const { error: profileUpsertErr } = await adminClient
        .from("profiles")
        .upsert({
          id: createdUserId,
          full_name,
          role,
          active: true,
          updated_at: new Date().toISOString(),
        });

      if (profileUpsertErr) {
        return new Response(
          JSON.stringify({ error: `User created in auth, but profile update failed: ${profileUpsertErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Assign homestays if role is manager and homestays are provided
      if (role === "manager" && Array.isArray(assigned_homestays) && assigned_homestays.length > 0) {
        const rows = assigned_homestays.map((hId: string) => ({
          user_id: createdUserId,
          homestay_id: hId,
        }));
        await adminClient.from("manager_homestays").insert(rows);
      }

      // Log activity
      await adminClient.from("activity_log").insert({
        user_id: callerUser.id,
        action: "CREATE_USER",
        table_name: "profiles",
        record_id: createdUserId,
        details: { email, full_name, role, assigned_homestays },
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "User created successfully",
          user: { id: createdUserId, email, full_name, role },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: toggle_active
    if (action === "toggle_active") {
      const { user_id, active } = body;
      if (!user_id || typeof active !== "boolean") {
        return new Response(
          JSON.stringify({ error: "user_id and active status (boolean) required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent disabling yourself
      if (user_id === callerUser.id) {
        return new Response(
          JSON.stringify({ error: "You cannot disable your own super_admin account." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await adminClient
        .from("profiles")
        .update({ active, updated_at: new Date().toISOString() })
        .eq("id", user_id);

      // Also ban or unban in auth
      await adminClient.auth.admin.updateUserById(user_id, {
        ban_duration: active ? "none" : "876000h",
      });

      await adminClient.from("activity_log").insert({
        user_id: callerUser.id,
        action: active ? "ENABLE_USER" : "DISABLE_USER",
        table_name: "profiles",
        record_id: user_id,
        details: { active },
      });

      return new Response(
        JSON.stringify({ success: true, message: `User ${active ? "enabled" : "disabled"} successfully.` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: reset_password
    if (action === "reset_password") {
      const { user_id, new_password } = body;
      if (!user_id || !new_password || new_password.length < 6) {
        return new Response(
          JSON.stringify({ error: "user_id and new_password (min 6 characters) required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: resetErr } = await adminClient.auth.admin.updateUserById(user_id, {
        password: new_password,
      });

      if (resetErr) {
        return new Response(
          JSON.stringify({ error: resetErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await adminClient.from("activity_log").insert({
        user_id: callerUser.id,
        action: "RESET_PASSWORD",
        table_name: "profiles",
        record_id: user_id,
        details: { reset_by: callerUser.id },
      });

      return new Response(
        JSON.stringify({ success: true, message: "User password reset successfully." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: update_role
    if (action === "update_role") {
      const { user_id, role, assigned_homestays } = body;
      if (!user_id || !role) {
        return new Response(
          JSON.stringify({ error: "user_id and role required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await adminClient
        .from("profiles")
        .update({ role, updated_at: new Date().toISOString() })
        .eq("id", user_id);

      // If assigned_homestays provided
      if (Array.isArray(assigned_homestays)) {
        await adminClient.from("manager_homestays").delete().eq("user_id", user_id);
        if (role === "manager" && assigned_homestays.length > 0) {
          const rows = assigned_homestays.map((hId: string) => ({
            user_id,
            homestay_id: hId,
          }));
          await adminClient.from("manager_homestays").insert(rows);
        }
      }

      await adminClient.from("activity_log").insert({
        user_id: callerUser.id,
        action: "UPDATE_ROLE",
        table_name: "profiles",
        record_id: user_id,
        details: { role, assigned_homestays },
      });

      return new Response(
        JSON.stringify({ success: true, message: "User role updated successfully." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unsupported action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "An unexpected error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
