import { useEffect, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { ImageIcon, LoaderCircle, Minus, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { createCroppedProfilePhoto } from "@/lib/image-processing";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ProductPhotoEditor({
  value,
  existingUrl,
  onChange,
  onRemove,
}: {
  value: File | null;
  existingUrl?: string | null;
  onChange: (file: File | null) => void;
  onRemove?: () => void;
}) {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [open, setOpen] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!value) return setPreviewUrl("");
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  useEffect(() => {
    if (!sourceFile) return setSourceUrl("");
    const url = URL.createObjectURL(sourceFile);
    setSourceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [sourceFile]);

  function selectPhoto(file?: File) {
    if (!file) return;
    if (!SUPPORTED_TYPES.includes(file.type))
      return toast.error("Use uma imagem JPG, PNG ou WebP.");
    if (file.size > MAX_FILE_SIZE)
      return toast.error("A imagem original deve ter no máximo 10 MB.");
    setSourceFile(file);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    setOpen(true);
  }

  async function save() {
    if (!sourceFile || !croppedArea) return;
    setProcessing(true);
    try {
      onChange(await createCroppedProfilePhoto(sourceFile, croppedArea));
      setOpen(false);
      setSourceFile(null);
      toast.success("Foto do produto recortada e otimizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível processar a foto.");
    } finally {
      setProcessing(false);
    }
  }

  function cancel() {
    if (processing) return;
    setOpen(false);
    setSourceFile(null);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid size-32 place-items-center overflow-hidden rounded-xl border-2 border-primary/15 bg-primary/5 shadow-sm">
          {previewUrl || existingUrl ? (
            <img
              src={previewUrl || existingUrl || ""}
              alt="Prévia do produto"
              className="size-full object-contain"
            />
          ) : (
            <ImageIcon className="size-10 text-primary/45" />
          )}
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" asChild>
              <label className="cursor-pointer">
                <Upload />
                {value || existingUrl ? "Trocar foto" : "Selecionar foto"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    selectPhoto(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </Button>
            {(value || existingUrl) && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onChange(null);
                  onRemove?.();
                }}
              >
                <Trash2 />
                Remover
              </Button>
            )}
          </div>
          <p className="max-w-md text-xs text-muted-foreground">
            JPG, PNG ou WebP de até 10 MB. A imagem será recortada e otimizada em 600 × 600 px.
          </p>
        </div>
      </div>
      <Dialog open={open} onOpenChange={(next) => !next && cancel()}>
        <DialogContent className="max-h-[96vh] max-w-2xl overflow-y-auto sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Ajustar foto do produto</DialogTitle>
            <DialogDescription>
              Centralize a embalagem na área quadrada e ajuste o zoom antes de salvar.
            </DialogDescription>
          </DialogHeader>
          <div className="relative h-[min(58vh,520px)] min-h-72 overflow-hidden rounded-xl bg-slate-950">
            {sourceUrl && (
              <Cropper
                image={sourceUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="rect"
                showGrid
                objectFit="contain"
                minZoom={1}
                maxZoom={4}
                zoomWithScroll
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedArea(pixels)}
                style={{
                  cropAreaStyle: {
                    border: "2px solid white",
                    boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.66)",
                  },
                }}
              />
            )}
          </div>
          <div className="flex items-center gap-3 px-1">
            <Minus className="size-4 text-muted-foreground" />
            <Slider
              value={[zoom]}
              min={1}
              max={4}
              step={0.01}
              onValueChange={([value]) => setZoom(value)}
            />
            <Plus className="size-4 text-muted-foreground" />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={cancel} disabled={processing}>
              Cancelar
            </Button>
            <Button type="button" onClick={save} disabled={!croppedArea || processing}>
              {processing ? <LoaderCircle className="animate-spin" /> : <Upload />}
              {processing ? "Processando..." : "Salvar foto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
