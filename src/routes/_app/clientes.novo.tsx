import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/layout/PageChrome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createClient } from "@/services/clients";
import { ClientPhotoEditor } from "@/components/clients/ClientPhotoEditor";

export const Route = createFileRoute("/_app/clientes/novo")({
  head: () => ({ meta: [{ title: "Novo cliente — Espaço+" }] }),
  component: NovoCliente,
});
const schema = z.object({
  full_name: z.string().min(3, "Informe o nome completo."),
  cpf: z.string().optional(),
  birth_date: z.string().optional(),
  phone: z.string().min(10, "Informe um telefone válido."),
  whatsapp: z.string().optional(),
  email: z.string().email("E-mail inválido.").or(z.literal("")),
  primary_goal: z.string().min(2, "Informe o objetivo."),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function NovoCliente() {
  const nav = useNavigate();
  const [photo, setPhoto] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", primary_goal: "Emagrecimento" },
  });
  const submit = handleSubmit(async (values) => {
    try {
      const client = await createClient({ ...values, status: "new" }, photo);
      toast.success("Cliente cadastrado com sucesso.");
      nav({ to: "/clientes/$id", params: { id: client.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao cadastrar cliente.");
    }
  });
  const field = (name: keyof FormData, label: string, type = "text") => (
    <div>
      <Label htmlFor={name} className="mb-1.5 block">
        {label}
      </Label>
      <Input id={name} type={type} {...register(name)} />
      {errors[name] && <p className="mt-1 text-xs text-destructive">{errors[name]?.message}</p>}
    </div>
  );
  return (
    <form onSubmit={submit} className="space-y-5">
      <PageHeader
        title="Novo cliente"
        description="Cadastre os dados essenciais; o histórico será preservado."
      />
      <Card>
        <CardHeader>
          <CardTitle>Dados pessoais</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="photo" className="mb-2 block">
              Foto do cliente
            </Label>
            <ClientPhotoEditor value={photo} onChange={setPhoto} />
          </div>
          <div className="md:col-span-2">{field("full_name", "Nome completo")}</div>
          {field("cpf", "CPF")}
          {field("birth_date", "Data de nascimento", "date")}
          {field("phone", "Telefone")}
          {field("whatsapp", "WhatsApp")}
          {field("email", "E-mail", "email")}
          {field("primary_goal", "Objetivo principal")}
          <div className="md:col-span-2">
            <Label htmlFor="notes" className="mb-1.5 block">
              Observações
            </Label>
            <Textarea id="notes" {...register("notes")} />
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          <Check />
          {isSubmitting ? "Salvando..." : "Concluir cadastro"}
        </Button>
      </div>
    </form>
  );
}
