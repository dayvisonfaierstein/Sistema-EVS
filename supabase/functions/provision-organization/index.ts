import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ProvisionInput = {
  legalName: string;
  tradeName: string;
  document?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  adminName: string;
  adminEmail: string;
  delivery: "invite" | "temporary_password";
};

function temporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const values = crypto.getRandomValues(new Uint32Array(18));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
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
      .select("id,is_platform_admin,role,active,deleted_at")
      .eq("id", user.id)
      .single();
    if (
      !caller?.active ||
      caller.deleted_at ||
      (!caller.is_platform_admin && caller.role !== "super_admin")
    ) {
      throw new Error("Somente o Super Admin pode cadastrar novos Espaços");
    }

    const input = (await request.json()) as ProvisionInput;
    const adminEmail = input.adminEmail?.trim().toLowerCase();
    if (input.legalName?.trim().length < 3 || input.tradeName?.trim().length < 2) {
      throw new Error("Informe a razão social e o nome do Espaço");
    }
    if (input.adminName?.trim().length < 3 || !adminEmail?.includes("@")) {
      throw new Error("Informe o nome e o e-mail do administrador");
    }
    if (!["invite", "temporary_password"].includes(input.delivery)) {
      throw new Error("Forma de acesso inválida");
    }

    const { data: existingProfile } = await serviceClient
      .from("profiles")
      .select("id,organization_id,active,deleted_at")
      .eq("email", adminEmail)
      .maybeSingle();
    if (existingProfile) {
      const { data: previousOrganization } = existingProfile.organization_id
        ? await serviceClient
            .from("organizations")
            .select("id,status,active,deleted_at")
            .eq("id", existingProfile.organization_id)
            .maybeSingle()
        : { data: null };
      const accountCanBeReused =
        !existingProfile.active &&
        Boolean(
          existingProfile.deleted_at ||
          previousOrganization?.deleted_at ||
          previousOrganization?.status === "cancelled" ||
          previousOrganization?.active === false,
        );
      if (!accountCanBeReused) {
        throw new Error("Já existe um usuário ativo com este e-mail");
      }
    }

    const { data: organization, error: organizationError } = await serviceClient
      .from("organizations")
      .insert({
        legal_name: input.legalName.trim(),
        trade_name: input.tradeName.trim(),
        document: input.document?.replace(/\D/g, "") || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim().toLowerCase() || null,
        city: input.city?.trim() || null,
        state: input.state?.trim().toUpperCase() || null,
        responsible_name: input.adminName.trim(),
        responsible_email: adminEmail,
        status: "pending",
        subscription_status: "pending",
        onboarding_completed: false,
        active: true,
      })
      .select("id,trade_name")
      .single();
    if (organizationError || !organization) {
      throw new Error(organizationError?.message || "Não foi possível criar a organização");
    }

    let createdUserId: string | undefined;
    let generatedPassword: string | undefined;
    try {
      const redirectTo =
        Deno.env.get("FIRST_ACCESS_REDIRECT_URL") ||
        `${request.headers.get("origin") || ""}/onboarding`;
      const authResult = existingProfile
        ? await (async () => {
            if (input.delivery === "temporary_password") {
              generatedPassword = temporaryPassword();
              return serviceClient.auth.admin.updateUserById(existingProfile.id, {
                password: generatedPassword,
                email_confirm: true,
                user_metadata: { full_name: input.adminName.trim(), first_access: true },
              });
            }
            const result = await serviceClient.auth.admin.updateUserById(existingProfile.id, {
              email_confirm: true,
              user_metadata: { full_name: input.adminName.trim(), first_access: true },
            });
            if (!result.error) {
              const { error: recoveryError } = await userClient.auth.resetPasswordForEmail(
                adminEmail,
                { redirectTo },
              );
              if (recoveryError) return { data: result.data, error: recoveryError };
            }
            return result;
          })()
        : input.delivery === "invite"
          ? await serviceClient.auth.admin.inviteUserByEmail(adminEmail, {
              redirectTo,
              data: { full_name: input.adminName.trim(), first_access: true },
            })
          : await (async () => {
              generatedPassword = temporaryPassword();
              return serviceClient.auth.admin.createUser({
                email: adminEmail,
                password: generatedPassword,
                email_confirm: true,
                user_metadata: { full_name: input.adminName.trim(), first_access: true },
              });
            })();

      if (authResult.error || !authResult.data.user) {
        throw new Error(authResult.error?.message || "Não foi possível criar o acesso");
      }
      createdUserId = authResult.data.user.id;

      const profilePayload = {
        organization_id: organization.id,
        full_name: input.adminName.trim(),
        email: adminEmail,
        role: "administrator",
        active: true,
        deleted_at: null,
        is_platform_admin: false,
        is_organization_admin: true,
        first_access: true,
        access_template: "administrator",
        invited_at: new Date().toISOString(),
        provisioned_by: user.id,
        provisional_access_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const { error: profileError } = existingProfile
        ? await serviceClient.from("profiles").update(profilePayload).eq("id", createdUserId)
        : await serviceClient.from("profiles").insert({ id: createdUserId, ...profilePayload });
      if (profileError) throw new Error(profileError.message);

      await serviceClient.from("audit_logs").insert({
        organization_id: organization.id,
        user_id: user.id,
        action: "organization.provisioned",
        entity: "organization",
        entity_id: organization.id,
        new_data: {
          administrator_id: createdUserId,
          administrator_email: adminEmail,
          delivery: input.delivery,
        },
      });

      return new Response(
        JSON.stringify({
          organizationId: organization.id,
          organizationName: organization.trade_name,
          adminEmail,
          delivery: input.delivery,
          temporaryPassword: generatedPassword,
          expiresInDays: 7,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (error) {
      if (createdUserId && !existingProfile) {
        await serviceClient.auth.admin.deleteUser(createdUserId);
      }
      await serviceClient.from("organizations").delete().eq("id", organization.id);
      throw error;
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Falha ao cadastrar o Espaço",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
