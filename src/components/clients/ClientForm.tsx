import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, LoaderCircle } from "lucide-react";
import type { Client } from "@/types/database";
import { ClientPhotoEditor } from "@/components/clients/ClientPhotoEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  full_name: z.string().trim().min(3, "Informe o nome completo."),
  cpf: z.string().optional(),
  birth_date: z.string().min(1, "Informe a data de nascimento."),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("E-mail inválido.").or(z.literal("")),
  primary_goal: z.string().optional(),
  notes: z.string().optional(),
});

export type ClientFormValues = z.infer<typeof schema>;

export function ClientForm({
  initialValues,
  existingPhotoUrl,
  onSubmit,
  submitLabel,
}: {
  initialValues?: Partial<ClientFormValues>;
  existingPhotoUrl?: string | null;
  onSubmit: (
    values: ClientFormValues,
    photo: File | null,
    removeExistingPhoto: boolean,
  ) => Promise<void>;
  submitLabel: string;
}) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);
  const initialPhone = initialValues?.phone ?? "";
  const initialWhatsapp = initialValues?.whatsapp ?? "";
  const [phoneIsWhatsapp, setPhoneIsWhatsapp] = useState(
    Boolean(initialPhone && initialPhone === initialWhatsapp),
  );
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      cpf: "",
      birth_date: "",
      phone: "",
      whatsapp: "",
      email: "",
      primary_goal: "",
      notes: "",
      ...initialValues,
    },
  });
  const phone = watch("phone");

  useEffect(() => {
    if (phoneIsWhatsapp) setValue("whatsapp", phone ?? "");
  }, [phone, phoneIsWhatsapp, setValue]);

  const submit = handleSubmit(async (values) => {
    await onSubmit(
      { ...values, whatsapp: phoneIsWhatsapp ? values.phone : values.whatsapp },
      photo,
      removeExistingPhoto,
    );
  });

  const field = (
    name: keyof ClientFormValues,
    label: string,
    options?: { type?: string; required?: boolean; readOnly?: boolean },
  ) => (
    <div>
      <Label htmlFor={name} className="mb-1.5 block">
        {label}
        {options?.required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <Input
        id={name}
        type={options?.type ?? "text"}
        readOnly={options?.readOnly}
        {...register(name)}
      />
      {errors[name] && <p className="mt-1 text-xs text-destructive">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Foto do cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientPhotoEditor
            value={photo}
            existingUrl={removeExistingPhoto ? null : existingPhotoUrl}
            onChange={(file) => {
              setPhoto(file);
              if (file) setRemoveExistingPhoto(false);
            }}
            onRemove={() => {
              setPhoto(null);
              setRemoveExistingPhoto(Boolean(existingPhotoUrl));
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados pessoais</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            {field("full_name", "Nome completo", { required: true })}
          </div>
          {field("birth_date", "Data de nascimento", { type: "date", required: true })}
          {field("cpf", "CPF")}
          <div>
            {field("phone", "Telefone")}
            <div className="mt-2 flex items-center gap-2">
              <Checkbox
                id="phone-is-whatsapp"
                checked={phoneIsWhatsapp}
                onCheckedChange={(checked) => setPhoneIsWhatsapp(checked === true)}
                disabled={!phone}
              />
              <Label htmlFor="phone-is-whatsapp" className="cursor-pointer text-sm font-normal">
                Este número também é WhatsApp
              </Label>
            </div>
          </div>
          <div className={phoneIsWhatsapp ? "opacity-60" : ""}>
            {field("whatsapp", "WhatsApp", { readOnly: phoneIsWhatsapp })}
            {phoneIsWhatsapp && (
              <p className="mt-1 text-xs text-muted-foreground">
                Será utilizado o mesmo número do telefone.
              </p>
            )}
          </div>
          {field("email", "E-mail", { type: "email" })}
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
          {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Check />}
          {isSubmitting ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
