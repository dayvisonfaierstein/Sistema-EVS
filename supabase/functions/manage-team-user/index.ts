import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action = "create" | "update" | "set_status" | "reset_access" | "promote_administrator";

type Input = {
  action: Action;
  userId?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  accessTemplate?: string;
  active?: boolean;
  delivery?: "invite" | "temporary_password";
};

const validTemplates = ["commercial", "service", "assessment", "inventory", "finance", "custom"];

function roleForTemplate(template: string) {
  if (template === "assessment") return "evaluator";
  if (template === "inventory") return "inventory";
  if (template === "finance") return "finance";
  return "attendant";
}

function temporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const values = crypto.getRandomValues(new Uint32Array(18));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Ambiente da função não configurado");
    }

    const authorization = request.headers.get("Authorization");
    if (!authorization) throw new Error("Sessão não informada");

    const token = authorization.replace(/^Bearer\s+/i, "");
    const userClient = createClient(supabaseUrl, anonKey);
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(token);
    if (userError || !user) throw new Error("Sessão inválida");

    const { data: caller } = await serviceClient
      .from("profiles")
      .select("id,organization_id,is_organization_admin,role,active,deleted_at")
      .eq("id", user.id)
      .single();
    if (
      !caller?.active ||
      caller.deleted_at ||
      !caller.organization_id ||
      (!caller.is_organization_admin && caller.role !== "administrator")
    ) {
      throw new Error("Somente o administrador do Espaço pode gerenciar a equipe");
    }

    const input = (await request.json()) as Input;
    const now = new Date().toISOString();
    const expiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const audit = async (
      action: string,
      entityId: string,
      oldData: Record<string, unknown> | null,
      newData: Record<string, unknown>,
    ) => {
      await serviceClient.from("audit_logs").insert({
        organization_id: caller.organization_id,
        user_id: caller.id,
        action,
        entity: "profile",
        entity_id: entityId,
        old_data: oldData,
        new_data: newData,
      });
    };

    const syncTemplatePermissions = async (userId: string, templateKey: string) => {
      const { data: template } = await serviceClient
        .from("access_templates")
        .select("id")
        .eq("key", templateKey)
        .eq("active", true)
        .single();
      if (!template) throw new Error("Modelo de acesso inválido");

      const { data: templatePermissions } = await serviceClient
        .from("access_template_permissions")
        .select("permission_id")
        .eq("template_id", template.id);

      await serviceClient
        .from("user_permissions")
        .delete()
        .eq("organization_id", caller.organization_id)
        .eq("user_id", userId);

      if (templatePermissions?.length) {
        const { error } = await serviceClient.from("user_permissions").insert(
          templatePermissions.map(({ permission_id }) => ({
            organization_id: caller.organization_id,
            user_id: userId,
            permission_id,
            granted: true,
            granted_by: caller.id,
          })),
        );
        if (error) throw error;
      }
    };

    if (input.action === "create") {
      const fullName = input.fullName?.trim();
      const email = input.email?.trim().toLowerCase();
      const template = input.accessTemplate ?? "service";
      const delivery = input.delivery ?? "temporary_password";
      if (!fullName || fullName.length < 3 || !email?.includes("@")) {
        throw new Error("Informe o nome completo e um e-mail válido");
      }
      if (!validTemplates.includes(template)) throw new Error("Modelo de acesso inválido");

      const { data: existingProfile } = await serviceClient
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (existingProfile) throw new Error("Já existe um usuário com este e-mail");

      let generatedPassword: string | undefined;
      const redirectTo =
        Deno.env.get("FIRST_ACCESS_REDIRECT_URL") ||
        `${request.headers.get("origin") || ""}/onboarding`;
      const authResult =
        delivery === "invite"
          ? await serviceClient.auth.admin.inviteUserByEmail(email, {
              redirectTo,
              data: { full_name: fullName, first_access: true },
            })
          : await (async () => {
              generatedPassword = temporaryPassword();
              return serviceClient.auth.admin.createUser({
                email,
                password: generatedPassword,
                email_confirm: true,
                user_metadata: { full_name: fullName, first_access: true },
              });
            })();
      if (authResult.error || !authResult.data.user) {
        throw new Error(authResult.error?.message || "Não foi possível criar o acesso");
      }

      const createdUserId = authResult.data.user.id;
      try {
        const { error: profileError } = await serviceClient.from("profiles").insert({
          id: createdUserId,
          organization_id: caller.organization_id,
          full_name: fullName,
          email,
          phone: input.phone?.trim() || null,
          job_title: input.jobTitle?.trim() || null,
          role: roleForTemplate(template),
          active: true,
          is_platform_admin: false,
          is_organization_admin: false,
          first_access: true,
          access_template: template,
          invited_at: now,
          provisioned_by: caller.id,
          provisional_access_expires_at: expiration,
        });
        if (profileError) throw profileError;
        await syncTemplatePermissions(createdUserId, template);
        await audit("team.user_created", createdUserId, null, {
          email,
          access_template: template,
          delivery,
        });
      } catch (error) {
        await serviceClient.auth.admin.deleteUser(createdUserId);
        throw error;
      }

      return json({
        userId: createdUserId,
        email,
        delivery,
        temporaryPassword: generatedPassword,
        expiresInDays: 7,
      });
    }

    if (!input.userId) throw new Error("Usuário não informado");
    const { data: target } = await serviceClient
      .from("profiles")
      .select("*")
      .eq("id", input.userId)
      .eq("organization_id", caller.organization_id)
      .is("deleted_at", null)
      .single();
    if (!target) throw new Error("Usuário não encontrado neste Espaço");

    if (input.action === "update") {
      if (target.is_organization_admin || target.role === "administrator") {
        throw new Error(
          "Os dados do administrador principal devem ser alterados no próprio perfil",
        );
      }
      const fullName = input.fullName?.trim();
      const template = input.accessTemplate ?? target.access_template ?? "custom";
      if (!fullName || fullName.length < 3) throw new Error("Informe o nome completo");
      if (!validTemplates.includes(template)) throw new Error("Modelo de acesso inválido");

      const { error } = await serviceClient
        .from("profiles")
        .update({
          full_name: fullName,
          phone: input.phone?.trim() || null,
          job_title: input.jobTitle?.trim() || null,
          access_template: template,
          role: roleForTemplate(template),
        })
        .eq("id", target.id);
      if (error) throw error;
      await syncTemplatePermissions(target.id, template);
      await audit(
        "team.user_updated",
        target.id,
        { access_template: target.access_template },
        { access_template: template, full_name: fullName },
      );
      return json({ success: true });
    }

    if (input.action === "set_status") {
      if (target.id === caller.id) throw new Error("Você não pode inativar o próprio acesso");
      if (target.is_organization_admin || target.role === "administrator") {
        throw new Error("Um administrador não pode ser inativado diretamente");
      }
      const active = Boolean(input.active);
      const { error } = await serviceClient.from("profiles").update({ active }).eq("id", target.id);
      if (error) throw error;
      await audit(
        active ? "team.user_activated" : "team.user_deactivated",
        target.id,
        { active: target.active },
        { active },
      );
      return json({ success: true });
    }

    if (input.action === "reset_access") {
      if (!target.active) throw new Error("Ative o usuário antes de redefinir o acesso");
      const generatedPassword = temporaryPassword();
      const { error: authError } = await serviceClient.auth.admin.updateUserById(target.id, {
        password: generatedPassword,
        email_confirm: true,
      });
      if (authError) throw authError;
      const { error: profileError } = await serviceClient
        .from("profiles")
        .update({
          first_access: true,
          invited_at: now,
          provisioned_by: caller.id,
          provisional_access_expires_at: expiration,
        })
        .eq("id", target.id);
      if (profileError) throw profileError;
      await audit("team.user_access_reset", target.id, null, { expires_at: expiration });
      return json({
        email: target.email,
        temporaryPassword: generatedPassword,
        expiresInDays: 7,
      });
    }

    if (input.action === "promote_administrator") {
      if (!target.active) throw new Error("Ative o usuário antes de promovê-lo");
      if (target.is_organization_admin || target.role === "administrator") {
        throw new Error("Este usuário já é administrador");
      }
      const { error } = await serviceClient
        .from("profiles")
        .update({
          role: "administrator",
          is_organization_admin: true,
          access_template: "administrator",
        })
        .eq("id", target.id);
      if (error) throw error;
      await serviceClient
        .from("user_permissions")
        .delete()
        .eq("organization_id", caller.organization_id)
        .eq("user_id", target.id);
      await audit(
        "team.user_promoted_administrator",
        target.id,
        { role: target.role, is_organization_admin: target.is_organization_admin },
        { role: "administrator", is_organization_admin: true },
      );
      return json({ success: true });
    }

    throw new Error("Ação inválida");
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Falha ao gerenciar usuário" },
      400,
    );
  }
});
